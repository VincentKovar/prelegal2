"""Document type definitions, loaded from catalog.json instead of a hardcoded enum.

catalog.json lives at the project root and is generated from
packages/templates/src/manifest.ts. Each entry looks like:

{
  "id": "mutual-nda",
  "title": "Mutual Non-Disclosure Agreement",
  "description": "...",
  "file": "packages/templates/templates/mutual-nda.md",
  "fields": [
    {"key": "party_a_name", "label": "Party A Name", "required": true},
    ...
  ]
}
"""

import json
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).parent.parent.parent
CATALOG_PATH = PROJECT_ROOT / "catalog.json"


class TemplateField(BaseModel):
    """A single fillable field on a template."""

    key: str
    label: str
    required: bool = True


class DocumentTemplate(BaseModel):
    """A document type as defined in catalog.json."""

    id: str
    title: str
    description: str
    file: str
    fields: list[TemplateField]


def load_catalog() -> list[DocumentTemplate]:
    """Load and parse catalog.json from the project root."""
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return [DocumentTemplate.model_validate(entry) for entry in raw]


# Loaded once at import time; restart the backend if catalog.json changes.
DOCUMENT_CATALOG: list[DocumentTemplate] = load_catalog()
DOCUMENT_CATALOG_BY_ID: dict[str, DocumentTemplate] = {doc.id: doc for doc in DOCUMENT_CATALOG}


def get_document_catalog_text() -> str:
    """Generate the document catalog text for the AI system prompt."""
    lines = []
    for doc in DOCUMENT_CATALOG:
        lines.append(f"- {doc.title} ({doc.id}): {doc.description}")
    return "\n".join(lines)


def get_template(document_id: str) -> DocumentTemplate:
    """Look up a document template by id. Raises KeyError if unknown."""
    if document_id not in DOCUMENT_CATALOG_BY_ID:
        raise KeyError(f"Unknown document type: {document_id}")
    return DOCUMENT_CATALOG_BY_ID[document_id]


def load_template_body(document_id: str) -> str:
    """Read the raw markdown body (with {{placeholder}} tokens) for a document type."""
    template = get_template(document_id)
    return (PROJECT_ROOT / template.file).read_text(encoding="utf-8")


# API Models for document CRUD operations


class DocumentSaveRequest(BaseModel):
    """Request to save a document."""

    document_type: str
    title: str
    form_data: dict


class DocumentUpdateRequest(BaseModel):
    """Request to update a document."""

    title: str
    form_data: dict


class DocumentResponse(BaseModel):
    """Document information response."""

    id: int
    document_type: str
    title: str
    form_data: dict
    created_at: str
    updated_at: str


class DocumentListResponse(BaseModel):
    """List of user documents."""

    documents: list[DocumentResponse]
