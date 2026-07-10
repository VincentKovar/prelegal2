"""Read-only route exposing the document catalog to the frontend."""

from fastapi import APIRouter

from models.documents import DOCUMENT_CATALOG

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("")
async def get_catalog():
    """List all supported document types and their fields."""
    return [doc.model_dump() for doc in DOCUMENT_CATALOG]
