"""
Transcription router — file upload transcription, resummarize, translate.
"""
import asyncio
import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.models import User
from app.services.transcription import transcribe_audio
from app.services.summarizer import summarize_transcript, translate_text
from app.auth import get_current_user

router = APIRouter(prefix="/api", tags=["transcription"])


@router.post("/transcribe-file")
async def transcribe_file(
    file: UploadFile = File(...),
    language: str = "",
    user: User = Depends(get_current_user),
):
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


@router.post("/translate")
async def translate_endpoint(
    body: dict,
    user: User = Depends(get_current_user),
):
    """Translate text to a target language using AI."""
    text = body.get("text", "")
    target = body.get("target_language", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text provided")
    if not target:
        raise HTTPException(status_code=400, detail="No target language specified")

    result = await translate_text(text, target)
    return {"translated_text": result, "target_language": target}


@router.post("/resummarize")
async def resummarize(
    body: dict,
    user: User = Depends(get_current_user),
):
    transcript_text = body.get("transcript", "")
    fmt = body.get("format", "meeting_notes")
    if not transcript_text.strip():
        raise HTTPException(status_code=400, detail="No transcript provided")

    summary = await summarize_transcript(transcript_text, fmt)
    return {"summary": summary}
