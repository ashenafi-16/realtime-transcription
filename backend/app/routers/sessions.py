"""
Sessions router — CRUD, share, export, analytics, settings.
"""
import io
import uuid
from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Session, TranscriptChunk, Summary, User
from app.auth import get_current_user

router = APIRouter(prefix="/api", tags=["sessions"])


# ──────────────────── Session CRUD ────────────────────

@router.get("/sessions")
async def list_sessions(
    tag: str = "",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Session)
        .where(Session.user_id == user.id)
        .order_by(Session.created_at.desc())
    )
    sessions = result.scalars().all()
    out = []
    for s in sessions:
        session_tags = [t.strip() for t in (s.tags or "").split(",") if t.strip()]
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
            "share_token": s.share_token,
        })
    return out


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.chunks), selectinload(Session.summary))
        .where(Session.id == session_id, Session.user_id == user.id)
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
        "chunks": [{"index": c.index, "text": c.text, "speaker": c.speaker or "", "start_time": c.start_time or 0} for c in session.chunks],
        "summary": session.summary.text if session.summary else None,
        "share_token": session.share_token,
    }


@router.put("/sessions/{session_id}")
async def update_session(
    session_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if "title" in body:
        session.title = body["title"]
    if "tags" in body:
        tags = body["tags"]
        session.tags = ",".join(tags) if isinstance(tags, list) else tags
    if "language" in body:
        session.language = body["language"]

    await db.commit()
    return {"status": "updated"}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    await db.commit()
    return {"status": "deleted"}


@router.put("/sessions/{session_id}/chunks/{chunk_index}/speaker")
async def update_chunk_speaker(
    session_id: int,
    chunk_index: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update the speaker label for a specific transcript chunk."""
    sess_check = await db.execute(
        select(Session.id).where(Session.id == session_id, Session.user_id == user.id)
    )
    if not sess_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

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


# ──────────────────── Share Links ────────────────────

@router.post("/sessions/{session_id}/share")
async def create_share_link(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate a public share token for a session."""
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.share_token:
        session.share_token = uuid.uuid4().hex
        await db.commit()

    return {"share_token": session.share_token}


@router.delete("/sessions/{session_id}/share")
async def revoke_share_link(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Revoke a public share link."""
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.share_token = None
    await db.commit()
    return {"status": "revoked"}


@router.get("/shared/{token}")
async def view_shared_session(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public: view a shared session (no auth required)."""
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.chunks), selectinload(Session.summary))
        .where(Session.share_token == token)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Shared session not found")

    return {
        "title": session.title,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "duration": session.duration,
        "language": session.language or "",
        "tags": [t.strip() for t in (session.tags or "").split(",") if t.strip()],
        "chunks": [{"index": c.index, "text": c.text, "speaker": c.speaker or "", "start_time": c.start_time or 0} for c in session.chunks],
        "summary": session.summary.text if session.summary else None,
    }


# ──────────────────── PDF Export ────────────────────

@router.get("/export/pdf/{session_id}")
async def export_pdf(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate a professional PDF of a session's transcript and summary."""
    from fpdf import FPDF

    result = await db.execute(
        select(Session)
        .options(selectinload(Session.chunks), selectinload(Session.summary))
        .where(Session.id == session_id, Session.user_id == user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(80, 40, 200)
    pdf.cell(0, 14, "VoiceScribe", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(30, 30, 50)
    title_text = session.title or "Untitled Session"
    pdf.cell(0, 12, title_text, new_x="LMARGIN", new_y="NEXT", align="C")

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

    pdf.set_draw_color(200, 200, 210)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(6)

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
            text = chunk.text or ""
            safe_text = text.encode('latin-1', errors='replace').decode('latin-1')
            pdf.multi_cell(0, 6, safe_text)
            pdf.ln(2)
    else:
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_text_color(150, 150, 160)
        pdf.cell(0, 8, "No transcript available", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(5)

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

    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(160, 160, 180)
    pdf.cell(0, 6, f"Generated by VoiceScribe on {datetime.now().strftime('%Y-%m-%d %H:%M')}", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf_bytes = pdf.output()
    buf = io.BytesIO(pdf_bytes)
    buf.seek(0)

    filename = f"voicescribe-{title_text[:30].replace(' ', '_')}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ──────────────────── Analytics ────────────────────

@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total_result = await db.execute(
        select(func.count(Session.id)).where(Session.user_id == user.id)
    )
    total_sessions = total_result.scalar() or 0

    total_chunks_result = await db.execute(
        select(func.count(TranscriptChunk.id))
        .join(Session, TranscriptChunk.session_id == Session.id)
        .where(Session.user_id == user.id)
    )
    total_chunks = total_chunks_result.scalar() or 0

    dur_result = await db.execute(
        select(func.sum(Session.duration), func.avg(Session.duration))
        .where(Session.user_id == user.id)
    )
    row = dur_result.first()
    total_seconds = row[0] or 0
    avg_duration = round(row[1] or 0)
    total_minutes = round(total_seconds / 60)

    sessions_result = await db.execute(
        select(Session.created_at, Session.duration)
        .where(Session.user_id == user.id)
        .order_by(Session.created_at)
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

    chunks_result = await db.execute(
        select(TranscriptChunk.text)
        .join(Session, TranscriptChunk.session_id == Session.id)
        .where(Session.user_id == user.id)
    )
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

    tags_result = await db.execute(
        select(Session.tags).where(Session.user_id == user.id)
    )
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


# ──────────────────── Server Settings ────────────────────

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
