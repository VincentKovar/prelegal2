"""Chat API routes for AI-powered document creation."""

import logging

from fastapi import APIRouter, HTTPException
from models.chat import ChatRequest, ChatResponse
from services.ai_service import get_greeting, process_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/greeting", response_model=ChatResponse)
async def greeting():
    """Get the initial AI greeting message."""
    return get_greeting()


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    Send a message and get AI response with extracted document fields.

    The request should include the full conversation history.
    The response includes the AI's reply and any extracted fields.
    """
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")

    try:
        return process_message(request.messages)
    except Exception as e:
        logger.exception("AI service error while processing chat message")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
