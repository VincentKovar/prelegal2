"""AI service for legal document chat using LiteLLM with a free OpenRouter model.

The system prompt and field list are built dynamically from catalog.json
(via models.documents), so adding, removing, or editing document types
never requires touching this file.
"""

from litellm import completion, exceptions as litellm_exceptions

from models.chat import Message, ChatResponse
from models.documents import DOCUMENT_CATALOG, get_document_catalog_text

MODEL = "openrouter/openai/gpt-oss-120b:free"

DOCUMENT_CATALOG_TEXT = get_document_catalog_text()


def _build_field_requirements_text() -> str:
    """Render each document type's field list for the system prompt."""
    sections = []
    for doc in DOCUMENT_CATALOG:
        field_lines = [
            f"  - {field.key}: {field.label}"
            + (" (required)" if field.required else " (optional)")
            for field in doc.fields
        ]
        sections.append(f"For {doc.title} ({doc.id}):\n" + "\n".join(field_lines))
    return "\n\n".join(sections)


FIELD_REQUIREMENTS_TEXT = _build_field_requirements_text()

SYSTEM_PROMPT = f"""You are a friendly legal assistant helping users create legal agreements.

AVAILABLE DOCUMENT TYPES:
{DOCUMENT_CATALOG_TEXT}

YOUR JOB:
1. First, determine what type of document the user needs through natural conversation.
2. Once the document type is clear, gather all required information for that document.
3. Ask questions conversationally, one or two at a time.
4. ALWAYS ask a follow-on question if you need more information - never leave the user waiting.
5. When all required fields are gathered, summarize and set isComplete to true.

DOCUMENT TYPE DETECTION:
- In the first 1-2 messages, determine which document type (by its id) fits the user's needs.
- Set the documentType field to that id once you've identified it.
- If the user asks for a document type NOT in the list above, politely explain we don't
  support it yet and suggest the SINGLE closest available document id in suggestedDocument.

FIELD REQUIREMENTS BY DOCUMENT TYPE:

{FIELD_REQUIREMENTS_TEXT}

HOW TO RETURN EXTRACTED DATA:
- Put every field value the user has provided so far into the "fields" object, using the
  exact field key shown above (e.g. "party_a_name", "effective_date"), as a string value.
- Only include keys relevant to the detected documentType.
- For dates, convert relative dates like "today" or "next Monday" to YYYY-MM-DD format.
- Suggest reasonable defaults when appropriate (e.g., "today" for effective date).

GUIDELINES:
- Be conversational and helpful, not robotic.
- Ask about one or two related things at a time.
- When users give information, acknowledge it naturally.
- IMPORTANT: Always ask a follow-on question until you have all required fields for the
  detected document type.
- When you have ALL required fields for the document type, summarize the details and set
  isComplete to true.

In your response field, write your conversational reply to the user.
In the fields object, extract any information the user has provided so far.
Only set isComplete to true when every required field for the detected documentType is present."""


def get_greeting() -> ChatResponse:
    """Return the initial greeting message."""
    doc_list = "\n".join(f"- {doc.title}?" for doc in DOCUMENT_CATALOG)
    return ChatResponse(
        response=(
            "Hello! I'll help you create a legal agreement. What type of document do you need? "
            f"For example, are you looking for:\n\n{doc_list}\n\n"
            "Just tell me what you're trying to accomplish and I'll help you find the right document."
        ),
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
