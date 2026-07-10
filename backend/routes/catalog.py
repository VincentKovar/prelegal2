"""Read-only route exposing the document catalog to the frontend."""

from fastapi import APIRouter, HTTPException

from models.documents import DOCUMENT_CATALOG, load_template_body

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("")
async def get_catalog():
    """List all supported document types and their fields."""
    return [doc.model_dump() for doc in DOCUMENT_CATALOG]


@router.get("/{document_id}/template")
async def get_template_body(document_id: str):
    """Return the raw markdown template body (with {{placeholder}} tokens) for a document type."""
    try:
        return {"body": load_template_body(document_id)}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown document type: {document_id}")
