"""Pydantic models for chat API.

Unlike a hardcoded per-document-type schema, extracted field values are
returned as a generic dict keyed by the "key" from catalog.json (e.g.
"party_a_name", "purchase_price"). This lets us support any number of
document types purely by editing catalog.json / packages/templates,
with no backend code changes.
"""

from typing import Literal, Optional
from pydantic import BaseModel


class Message(BaseModel):
    """A single chat message."""

    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""

    messages: list[Message]


class ChatResponse(BaseModel):
    """
    Structured response from the AI containing both the reply and
    extracted field values for whichever document type is in play.
    """

    response: str

    # Document type detection: must match an id in catalog.json once known.
    documentType: Optional[str] = None
    # If the user asks for something not in catalog.json, suggest the closest match.
    suggestedDocument: Optional[str] = None

    # Extracted field values, keyed by the field "key" from catalog.json
    # (e.g. {"party_a_name": "Acme Inc.", "effective_date": "2026-07-10"}).
    fields: dict[str, str] = {}

    # True once every required field for the detected document type is present.
    isComplete: bool = False
