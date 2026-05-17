"""
Chat router — Transcript Q&A endpoints.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Session, TranscriptChunk, ChatMessage, User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import ask_transcript
from app.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def send_message(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Send a question about a session's transcript and get an AI answer."""
    # Verify user owns the session
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.chunks))
        .where(Session.id == body.session_id, Session.user_id == user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Build transcript text
    transcript_text = "\n".join(
        f"[{c.speaker or f'Chunk {c.index+1}'}] {c.text}"
        for c in session.chunks
    )
    if not transcript_text.strip():
        raise HTTPException(status_code=400, detail="Session has no transcript")

    # Get existing chat history
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == body.session_id, ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at)
    )
    existing_messages = history_result.scalars().all()
    history = [{"role": m.role, "content": m.content} for m in existing_messages]

    # Save user message
    user_msg = ChatMessage(
        session_id=body.session_id,
        user_id=user.id,
        role="user",
        content=body.question,
    )
    db.add(user_msg)
    await db.flush()

    # Get AI answer
    answer = await ask_transcript(transcript_text, body.question, history)

    # Save assistant message
    ai_msg = ChatMessage(
        session_id=body.session_id,
        user_id=user.id,
        role="assistant",
        content=answer,
    )
    db.add(ai_msg)
    await db.commit()

    return ChatResponse(answer=answer, message_id=ai_msg.id)


@router.get("/{session_id}")
async def get_chat_history(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get chat history for a session."""
    # Verify ownership
    sess = await db.execute(
        select(Session.id).where(Session.id == session_id, Session.user_id == user.id)
    )
    if not sess.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id, ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.delete("/{session_id}")
async def clear_chat_history(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Clear chat history for a session."""
    sess = await db.execute(
        select(Session.id).where(Session.id == session_id, Session.user_id == user.id)
    )
    if not sess.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    await db.execute(
        delete(ChatMessage).where(
            ChatMessage.session_id == session_id,
            ChatMessage.user_id == user.id,
        )
    )
    await db.commit()
    return {"status": "cleared"}
