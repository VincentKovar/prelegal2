"""AI service for document-creation chat, using LiteLLM with a free OpenRouter model.

PREL-6 expands the chat beyond the single mutual-nda flow (PREL-5) to cover
every document type in catalog.json. The conversation runs in one of two modes:

- Pinned mode (documentType is known): the system prompt is scoped to that
  document's fields, same as the original NDA-only flow.
- Discovery mode (documentType is None): the system prompt lists the whole
  catalog and asks the AI to figure out which document fits the user's need,
  or to explain the mismatch and suggest the closest supported type if the
  request doesn't match anything in the catalog.
"""

from litellm import completion, exceptions as litellm_exceptions

from models.chat import Message, ChatResponse
from models.documents import DOCUMENT_CATALOG_BY_ID, get_document_catalog_text, get_template

MODEL = "openrouter/openai/gpt-oss-120b:free"

FOLLOW_UP_RULE = (
    "Never send a response without a follow-on question or clear next step for the "
    "user, unless isComplete is true - if any required field is still missing, your "
    "response must end by asking for it (or the next one or two missing fields)."
)


def _field_requirements_text(document_id: str) -> str:
    """Render a document's field list for the system prompt."""
    template = get_template(document_id)
    return "\n".join(
        f"  - {field.key}: {field.label}"
        + (" (required)" if field.required else " (optional)")
        for field in template.fields
    )


def _pinned_system_prompt(document_id: str) -> str:
    template = get_template(document_id)
    field_requirements_text = _field_requirements_text(document_id)

    return f"""You are a friendly legal assistant helping users fill out a
{template.title} ({template.description}).

YOUR JOB:
1. Gather all the fields below through natural, conversational back-and-forth.
2. Ask about one or two related fields at a time - {FOLLOW_UP_RULE}
3. When every required field is gathered, summarize the details and set isComplete to true.

FIELDS TO COLLECT:
{field_requirements_text}

HOW TO RETURN EXTRACTED DATA:
- Put every field value the user has provided so far into the "fields" object, using the
  exact field key shown above (e.g. "{template.fields[0].key}"), as a string value.
- For dates, convert relative dates like "today" or "next Monday" to YYYY-MM-DD format.
- Suggest reasonable defaults when appropriate (e.g., "today" for effective date).

GUIDELINES:
- Be conversational and helpful, not robotic.
- When users give information, acknowledge it naturally.
- Always set documentType to "{document_id}" in every response.
- Only set isComplete to true once every required field above is present in "fields".

In your response field, write your conversational reply to the user.
In the fields object, extract any information the user has provided so far."""


def _discovery_system_prompt() -> str:
    catalog_text = get_document_catalog_text()

    return f"""You are a friendly legal assistant for a document-drafting tool. The
tool can only generate the following document types - nothing else:

{catalog_text}

YOUR JOB:
1. Figure out which of the document types above (if any) the user needs, by asking
   about their situation. {FOLLOW_UP_RULE}
2. Once you're confident which document type fits, set "documentType" to its exact id
   (e.g. "mutual-nda") in your response, and briefly confirm your understanding with the
   user before moving into gathering fields.
3. If the user describes something that does NOT match any document type above (e.g. an
   employment contract, a lease, a will), do NOT set "documentType". Instead, politely
   explain that this tool can't generate that document, and set "suggestedDocument" to
   the id of the closest matching type from the list above, explaining briefly why it's
   the closest fit. Ask if they'd like to proceed with that one instead.
4. Never invent a document type or id that isn't in the list above.

Leave "fields" empty and "isComplete" false while still in this discovery step - field
collection only starts once a document type is confirmed.

In your response field, write your conversational reply to the user."""


def get_greeting(document_type: str | None = None) -> ChatResponse:
    """Return the initial greeting message, optionally scoped to a document type."""
    if document_type is not None:
        template = get_template(document_type)
        return ChatResponse(
            response=(
                f"Hello! I'll help you fill out a {template.title}. "
                "Let's start with the first couple of details - "
                f"{template.fields[0].label} and {template.fields[1].label if len(template.fields) > 1 else template.fields[0].label}?"
            ),
            documentType=document_type,
            isComplete=False,
        )

    return ChatResponse(
        response=(
            "Hi! I can help you draft a legal document. What are you working on - "
            "for example, an NDA, a letter of intent, or something else?"
        ),
        documentType=None,
        isComplete=False,
    )


def process_message(messages: list[Message], document_type: str | None = None) -> ChatResponse:
    """Process chat messages and return AI response with extracted fields.

    document_type pins the conversation to a known catalog id once confirmed;
    None means the conversation is still in discovery mode.
    """
    if document_type is not None and document_type not in DOCUMENT_CATALOG_BY_ID:
        raise ValueError(f"Unknown document type: {document_type}")

    system_prompt = (
        _pinned_system_prompt(document_type) if document_type is not None else _discovery_system_prompt()
    )

    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        llm_messages.append({"role": msg.role, "content": msg.content})

    try:
        response = completion(
            model=MODEL,
            messages=llm_messages,
            response_format=ChatResponse,
            reasoning_effort="low",
            drop_params=True,
        )
    except litellm_exceptions.RateLimitError:
        # Free-tier OpenRouter models have low rate limits; surface a friendly message
        # instead of a raw 500 so the frontend can show something sensible.
        return ChatResponse(
            response=(
                "We're getting a lot of requests right now and hit the free model's rate limit. "
                "Please wait a moment and try again."
            ),
            documentType=document_type,
            isComplete=False,
        )

    if not response.choices or not response.choices[0].message.content:
        raise ValueError("Invalid response from AI service")

    result = response.choices[0].message.content
    parsed = ChatResponse.model_validate_json(result)

    # Once pinned, keep the conversation pinned even if the model forgets to echo it.
    if document_type is not None and parsed.documentType is None:
        parsed.documentType = document_type

    return parsed
