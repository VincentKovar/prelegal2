"""Chat API routes for AI-powered document creation."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from models.chat import ChatRequest, ChatResponse
from services.ai_service import get_greeting, process_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/greeting", response_model=ChatResponse)
async def greeting(document_type: Optional[str] = None):
    """Get the initial AI greeting message, optionally scoped to a document type."""
    try:
        return get_greeting(document_type)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown document type: {document_type}")


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    Send a message and get AI response with extracted document fields.

    The request should include the full conversation history, and the
    documentType once it has been confirmed by an earlier response so the
    conversation stays pinned to that document type.
    """
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")

    try:
        return process_message(request.messages, request.documentType)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("AI service error while processing chat message")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
