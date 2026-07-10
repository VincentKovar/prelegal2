"""AI service for the mutual NDA chat, using LiteLLM with a free OpenRouter model.

PREL-5 scopes this chat to a single document type (mutual-nda). The field
list is still pulled from catalog.json (via models.documents) so it stays
in sync with the template's {{placeholder}} tokens, but the conversation
itself only ever targets the mutual-nda entry.
"""

from litellm import completion, exceptions as litellm_exceptions

from models.chat import Message, ChatResponse
from models.documents import get_template

MODEL = "openrouter/openai/gpt-oss-120b:free"

MUTUAL_NDA = get_template("mutual-nda")


def _build_field_requirements_text() -> str:
    """Render the mutual NDA's field list for the system prompt."""
    return "\n".join(
        f"  - {field.key}: {field.label}"
        + (" (required)" if field.required else " (optional)")
        for field in MUTUAL_NDA.fields
    )


FIELD_REQUIREMENTS_TEXT = _build_field_requirements_text()

SYSTEM_PROMPT = f"""You are a friendly legal assistant helping users fill out a
{MUTUAL_NDA.title} ({MUTUAL_NDA.description}).

YOUR JOB:
1. Gather all the fields below through natural, conversational back-and-forth.
2. Ask about one or two related fields at a time - never leave the user waiting
   without a follow-on question until everything is collected.
3. When every required field is gathered, summarize the details and set isComplete to true.

FIELDS TO COLLECT:
{FIELD_REQUIREMENTS_TEXT}

HOW TO RETURN EXTRACTED DATA:
- Put every field value the user has provided so far into the "fields" object, using the
  exact field key shown above (e.g. "party_a_name", "effective_date"), as a string value.
- For dates, convert relative dates like "today" or "next Monday" to YYYY-MM-DD format.
- Suggest reasonable defaults when appropriate (e.g., "today" for effective date).

GUIDELINES:
- Be conversational and helpful, not robotic.
- When users give information, acknowledge it naturally.
- Always set documentType to "mutual-nda" in every response.
- Only set isComplete to true once every required field above is present in "fields".

In your response field, write your conversational reply to the user.
In the fields object, extract any information the user has provided so far."""


def get_greeting() -> ChatResponse:
    """Return the initial greeting message."""
    return ChatResponse(
        response=(
            f"Hello! I'll help you fill out a {MUTUAL_NDA.title}. "
            "Let's start with the two parties involved - what are their names?"
        ),
        documentType="mutual-nda",
        isComplete=False,
    )


def process_message(messages: list[Message]) -> ChatResponse:
    """Process chat messages and return AI response with extracted fields."""
    llm_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in messages:
        llm_messages.append({"role": msg.role, "content": msg.content})

    try:
        response = completion(
            model=MODEL,
            messages=llm_messages,
            response_format=ChatResponse,
            reasoning_effort="low",
        )
    except litellm_exceptions.RateLimitError:
        # Free-tier OpenRouter models have low rate limits; surface a friendly message
        # instead of a raw 500 so the frontend can show something sensible.
        return ChatResponse(
            response=(
                "We're getting a lot of requests right now and hit the free model's rate limit. "
                "Please wait a moment and try again."
            ),
            isComplete=False,
        )

    if not response.choices or not response.choices[0].message.content:
        raise ValueError("Invalid response from AI service")

    result = response.choices[0].message.content
    return ChatResponse.model_validate_json(result)
