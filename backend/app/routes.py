import asyncio
import io
import logging
import os
import tempfile
from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Session, TranscriptChunk, Summary
from app.transcriber import transcribe_audio
from app.summarizer import summarize_transcript, translate_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ──────────────────────── Sessions CRUD ────────────────────────

@router.get("/sessions")
async def list_sessions(tag: str = "", db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).order_by(Session.created_at.desc())
    )
    sessions = result.scalars().all()
    out = []
    for s in sessions:
        session_tags = [t.strip() for t in (s.tags or "").split(",") if t.strip()]

        # Filter by tag if specified
        if tag and tag not in session_tags:
            continue

        chunk_count_result = await db.execute(
            select(func.count(TranscriptChunk.id)).where(TranscriptChunk.session_id == s.id)
        )
        chunk_count = chunk_count_result.scalar() or 0
        out.append({
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "duration": s.duration,
            "language": s.language or "",
            "tags": session_tags,
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
        "language": session.language or "",
        "tags": [t.strip() for t in (session.tags or "").split(",") if t.strip()],
        "chunks": [{"index": c.index, "text": c.text, "speaker": c.speaker or ""} for c in session.chunks],
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
    if "tags" in body:
        # Accept list or comma-separated string
        tags = body["tags"]
        if isinstance(tags, list):
            session.tags = ",".join(tags)
        else:
            session.tags = tags
    if "language" in body:
        session.language = body["language"]

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


# ──────────────────────── Speaker Labels ────────────────────────

@router.put("/sessions/{session_id}/chunks/{chunk_index}/speaker")
async def update_chunk_speaker(session_id: int, chunk_index: int, body: dict, db: AsyncSession = Depends(get_db)):
    """Update the speaker label for a specific transcript chunk."""
    result = await db.execute(
        select(TranscriptChunk)
        .where(TranscriptChunk.session_id == session_id, TranscriptChunk.index == chunk_index)
    )
    chunk = result.scalars().first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")

    chunk.speaker = body.get("speaker", "")
    await db.commit()
    return {"status": "updated", "speaker": chunk.speaker}


# ──────────────────────── File Upload Transcription ────────────────────────

@router.post("/transcribe-file")
async def transcribe_file(file: UploadFile = File(...), language: str = ""):
    """Upload an audio/video file and get it transcribed."""
    allowed_types = {'audio/', 'video/'}
    content_type = file.content_type or ''
    if not any(content_type.startswith(t) for t in allowed_types):
        raise HTTPException(status_code=400, detail="File must be an audio or video file")

    suffix = os.path.splitext(file.filename or ".tmp")[1]
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
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


# ──────────────────────── Translation ────────────────────────

@router.post("/translate")
async def translate_endpoint(body: dict):
    """Translate text to a target language using AI."""
    text = body.get("text", "")
    target = body.get("target_language", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text provided")
    if not target:
        raise HTTPException(status_code=400, detail="No target language specified")

    result = await translate_text(text, target)
    return {"translated_text": result, "target_language": target}


# ──────────────────────── Re-summarize ────────────────────────

@router.post("/resummarize")
async def resummarize(body: dict):
    transcript_text = body.get("transcript", "")
    fmt = body.get("format", "meeting_notes")
    if not transcript_text.strip():
        raise HTTPException(status_code=400, detail="No transcript provided")

    summary = await summarize_transcript(transcript_text, fmt)
    return {"summary": summary}


# ──────────────────────── PDF Export ────────────────────────

@router.get("/export/pdf/{session_id}")
async def export_pdf(session_id: int, db: AsyncSession = Depends(get_db)):
    """Generate a professional PDF of a session's transcript and summary."""
    from fpdf import FPDF

    result = await db.execute(
        select(Session)
        .options(selectinload(Session.chunks), selectinload(Session.summary))
        .where(Session.id == session_id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(80, 40, 200)
    pdf.cell(0, 14, "VoiceScribe", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(30, 30, 50)
    title_text = session.title or "Untitled Session"
    pdf.cell(0, 12, title_text, new_x="LMARGIN", new_y="NEXT", align="C")

    # Metadata
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(120, 120, 140)
    date_str = session.created_at.strftime("%B %d, %Y at %I:%M %p") if session.created_at else "Unknown"
    dur_str = f"{session.duration // 60}m {session.duration % 60}s" if session.duration else "N/A"
    lang_str = session.language.upper() if session.language else "Auto-detected"
    tags_list = [t.strip() for t in (session.tags or "").split(",") if t.strip()]
    tags_str = ", ".join(tags_list) if tags_list else "None"

    pdf.cell(0, 6, f"Date: {date_str}  |  Duration: {dur_str}  |  Language: {lang_str}", new_x="LMARGIN", new_y="NEXT", align="C")
    if tags_list:
        pdf.cell(0, 6, f"Tags: {tags_str}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(8)

    # Divider
    pdf.set_draw_color(200, 200, 210)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(6)

    # Transcript section
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(30, 30, 50)
    pdf.cell(0, 10, "Transcript", new_x="LMARGIN", new_y="NEXT")

    if session.chunks:
        for chunk in session.chunks:
            speaker = chunk.speaker if chunk.speaker else ""
            prefix = f"[{speaker}] " if speaker else f"[{chunk.index + 1:02d}] "

            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(100, 60, 200)
            pdf.write(6, prefix)

            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(40, 40, 60)
            # Use multi_cell for wrapping
            text = chunk.text or ""
            # Handle encoding — remove non-latin1 chars for basic FPDF
            safe_text = text.encode('latin-1', errors='replace').decode('latin-1')
            pdf.multi_cell(0, 6, safe_text)
            pdf.ln(2)
    else:
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_text_color(150, 150, 160)
        pdf.cell(0, 8, "No transcript available", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(5)

    # Summary section
    if session.summary and session.summary.text:
        pdf.set_draw_color(200, 200, 210)
        pdf.line(20, pdf.get_y(), 190, pdf.get_y())
        pdf.ln(6)

        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(30, 30, 50)
        pdf.cell(0, 10, "AI Summary", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(40, 40, 60)
        safe_summary = session.summary.text.encode('latin-1', errors='replace').decode('latin-1')
        pdf.multi_cell(0, 6, safe_summary)

    # Footer
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(160, 160, 180)
    pdf.cell(0, 6, f"Generated by VoiceScribe on {datetime.now().strftime('%Y-%m-%d %H:%M')}", new_x="LMARGIN", new_y="NEXT", align="C")

    # Output to bytes
    pdf_bytes = pdf.output()
    buf = io.BytesIO(pdf_bytes)
    buf.seek(0)

    filename = f"voicescribe-{title_text[:30].replace(' ', '_')}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ──────────────────────── Analytics ────────────────────────

@router.get("/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db)):
    total_result = await db.execute(select(func.count(Session.id)))
    total_sessions = total_result.scalar() or 0

    total_chunks_result = await db.execute(select(func.count(TranscriptChunk.id)))
    total_chunks = total_chunks_result.scalar() or 0

    dur_result = await db.execute(select(func.sum(Session.duration), func.avg(Session.duration)))
    row = dur_result.first()
    total_seconds = row[0] or 0
    avg_duration = round(row[1] or 0)
    total_minutes = round(total_seconds / 60)

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

    # Top words
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

    # Tags breakdown
    tags_result = await db.execute(select(Session.tags))
    all_tags_raw = tags_result.all()
    tag_counter = Counter()
    for (raw,) in all_tags_raw:
        if raw:
            for t in raw.split(","):
                t = t.strip()
                if t:
                    tag_counter[t] += 1
    tags_breakdown = [{"tag": t, "count": c} for t, c in tag_counter.most_common(10)]

    return {
        "total_sessions": total_sessions,
        "total_minutes": total_minutes,
        "total_chunks": total_chunks,
        "avg_duration": avg_duration,
        "recordings_per_day": recordings_per_day,
        "duration_over_time": duration_data,
        "top_words": top_words,
        "tags_breakdown": tags_breakdown,
    }


# ──────────────────────── Settings ────────────────────────

_server_settings = {
    "whisperModel": "base",
    "language": "",
    "chunkInterval": 4000,
    "summaryStyle": "meeting_notes",
    "customVocabulary": "",
}


@router.get("/settings")
async def get_settings():
    return _server_settings


@router.put("/settings")
async def update_settings(body: dict):
    for key in ["whisperModel", "language", "chunkInterval", "summaryStyle", "customVocabulary"]:
        if key in body:
            _server_settings[key] = body[key]
    return {"status": "updated", "settings": _server_settings}
