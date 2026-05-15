import asyncio
import logging
import os
import tempfile
from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Session, TranscriptChunk, Summary
from app.transcriber import transcribe_audio
from app.summarizer import summarize_transcript

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# ──────────────────────── Sessions CRUD ────────────────────────

@router.get("/sessions")
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).order_by(Session.created_at.desc())
    )
    sessions = result.scalars().all()
    out = []
    for s in sessions:
        # Count chunks
        chunk_count_result = await db.execute(
            select(func.count(TranscriptChunk.id)).where(TranscriptChunk.session_id == s.id)
        )
        chunk_count = chunk_count_result.scalar() or 0
        out.append({
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "duration": s.duration,
            "chunk_count": chunk_count,
        })
    return out


@router.get("/sessions/{session_id}")
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.chunks), selectinload(Session.summary))
        .where(Session.id == session_id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "duration": session.duration,
        "chunks": [{"index": c.index, "text": c.text} for c in session.chunks],
        "summary": session.summary.text if session.summary else None,
    }


@router.put("/sessions/{session_id}")
async def update_session(session_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if "title" in body:
        session.title = body["title"]

    await db.commit()
    return {"status": "updated"}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    await db.commit()
    return {"status": "deleted"}


# ──────────────────────── File Upload Transcription ────────────────────────

@router.post("/transcribe-file")
async def transcribe_file(file: UploadFile = File(...), language: str = ""):
    """Upload an audio/video file and get it transcribed."""
    # Validate file type
    allowed_types = {'audio/', 'video/'}
    content_type = file.content_type or ''
    if not any(content_type.startswith(t) for t in allowed_types):
        raise HTTPException(status_code=400, detail="File must be an audio or video file")

    # Save to temp file
    suffix = os.path.splitext(file.filename or ".tmp")[1]
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(status_code=400, detail="File too large (max 50MB)")
        tmp.write(content)
        tmp_path = tmp.name

    try:
        lang = language if language else None
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, transcribe_audio, tmp_path, lang)
        return {"transcript": text.strip() if text else ""}
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ──────────────────────── Re-summarize ────────────────────────

@router.post("/resummarize")
async def resummarize(body: dict):
    transcript_text = body.get("transcript", "")
    fmt = body.get("format", "meeting_notes")
    if not transcript_text.strip():
        raise HTTPException(status_code=400, detail="No transcript provided")

    summary = await summarize_transcript(transcript_text, fmt)
    return {"summary": summary}


# ──────────────────────── Analytics ────────────────────────

@router.get("/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db)):
    # Total sessions
    total_result = await db.execute(select(func.count(Session.id)))
    total_sessions = total_result.scalar() or 0

    # Total chunks
    total_chunks_result = await db.execute(select(func.count(TranscriptChunk.id)))
    total_chunks = total_chunks_result.scalar() or 0

    # Total and average duration
    dur_result = await db.execute(select(func.sum(Session.duration), func.avg(Session.duration)))
    row = dur_result.first()
    total_seconds = row[0] or 0
    avg_duration = round(row[1] or 0)
    total_minutes = round(total_seconds / 60)

    # Recordings per day (last 30 days)
    sessions_result = await db.execute(
        select(Session.created_at, Session.duration).order_by(Session.created_at)
    )
    all_sessions = sessions_result.all()

    day_counts = Counter()
    duration_data = []
    for s in all_sessions:
        if s.created_at:
            day = s.created_at.strftime("%m/%d")
            day_counts[day] += 1
            duration_data.append({"date": day, "duration": s.duration or 0})

    recordings_per_day = [{"date": d, "count": c} for d, c in day_counts.items()]

    # Top words from all transcripts
    chunks_result = await db.execute(select(TranscriptChunk.text))
    all_text = " ".join([r[0] for r in chunks_result.all() if r[0]])

    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                  'of', 'with', 'by', 'is', 'it', 'this', 'that', 'was', 'are', 'be',
                  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                  'should', 'may', 'might', 'can', 'not', 'so', 'if', 'as', 'from',
                  'i', 'you', 'he', 'she', 'we', 'they', 'me', 'my', 'your', 'his',
                  'her', 'our', 'their', 'its', 'what', 'which', 'who', 'when', 'where',
                  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
                  'some', 'such', 'no', 'nor', 'only', 'own', 'same', 'than', 'too',
                  'very', 'just', 'about', 'up', 'out', 'then', 'there', 'here', 'also'}

    words = [w.lower().strip('.,!?;:()[]"\'') for w in all_text.split() if len(w) > 2]
    words = [w for w in words if w and w not in stop_words]
    word_counts = Counter(words).most_common(10)
    top_words = [{"word": w, "count": c} for w, c in word_counts]

    return {
        "total_sessions": total_sessions,
        "total_minutes": total_minutes,
        "total_chunks": total_chunks,
        "avg_duration": avg_duration,
        "recordings_per_day": recordings_per_day,
        "duration_over_time": duration_data,
        "top_words": top_words,
    }


# ──────────────────────── Settings ────────────────────────

# In-memory settings (per server instance)
_server_settings = {
    "whisperModel": "base",
    "language": "",
    "chunkInterval": 4000,
    "summaryStyle": "meeting_notes",
}


@router.get("/settings")
async def get_settings():
    return _server_settings


@router.put("/settings")
async def update_settings(body: dict):
    for key in ["whisperModel", "language", "chunkInterval", "summaryStyle"]:
        if key in body:
            _server_settings[key] = body[key]
    return {"status": "updated", "settings": _server_settings}
