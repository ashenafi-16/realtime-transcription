import tempfile
import os
import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.transcriber import transcribe_audio
from app.summarizer import summarize_transcript
from app.database import async_session
from app.models import Session, TranscriptChunk, Summary

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/transcribe")
async def transcribe_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected")

    # Read query params for settings
    params = websocket.query_params
    language = params.get("language", "") or None
    model = params.get("model", "base")
    summary_format = params.get("format", "meeting_notes")

    full_transcript = []
    session_name = "Untitled Session"
    elapsed_seconds = 0

    try:
        while True:
            message = await websocket.receive()

            # Case 1: Audio chunk arrived
            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]
                logger.info(f"Received audio chunk: {len(audio_bytes)} bytes")

                with tempfile.NamedTemporaryFile(
                    suffix=".webm", delete=False
                ) as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = tmp.name

                try:
                    loop = asyncio.get_event_loop()
                    text = await loop.run_in_executor(
                        None, transcribe_audio, tmp_path, language
                    )

                    if text.strip():
                        full_transcript.append(text.strip())
                        await websocket.send_json({
                            "type": "transcript",
                            "text": text.strip()
                        })
                        logger.info(f"Sent transcript chunk #{len(full_transcript)}")
                    else:
                        logger.info("Empty transcription — skipped")
                except Exception as e:
                    logger.error(f"Transcription error: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "code": "TRANSCRIPTION_FAILED",
                        "message": str(e)
                    })
                finally:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)

            # Case 2: Text command from the browser
            elif "text" in message and message["text"]:
                raw = message["text"]
                logger.info(f"Received text: {raw[:100]}")

                # Try parsing as JSON command
                try:
                    cmd = json.loads(raw)
                    command = cmd.get("command", "")
                    session_name = cmd.get("session_name", session_name)
                    summary_format = cmd.get("format", summary_format)
                except (json.JSONDecodeError, AttributeError):
                    command = raw  # backwards compat: plain "STOP"

                if command == "STOP":
                    if full_transcript:
                        combined = " ".join(full_transcript)
                        logger.info(f"Summarizing {len(full_transcript)} chunks (format={summary_format})...")

                        await websocket.send_json({
                            "type": "status",
                            "text": "Generating summary..."
                        })

                        try:
                            summary_text = await summarize_transcript(combined, summary_format)
                            await websocket.send_json({
                                "type": "summary",
                                "text": summary_text
                            })
                            logger.info("Summary sent")

                            # Save to database
                            try:
                                async with async_session() as db:
                                    session = Session(
                                        title=session_name,
                                        duration=len(full_transcript) * 4  # approx
                                    )
                                    db.add(session)
                                    await db.flush()

                                    for i, chunk_text in enumerate(full_transcript):
                                        db.add(TranscriptChunk(
                                            session_id=session.id,
                                            index=i,
                                            text=chunk_text
                                        ))

                                    db.add(Summary(
                                        session_id=session.id,
                                        text=summary_text
                                    ))

                                    await db.commit()
                                    logger.info(f"Session saved: id={session.id}")

                                    await websocket.send_json({
                                        "type": "session_saved",
                                        "session_id": session.id
                                    })
                            except Exception as e:
                                logger.error(f"DB save error: {e}")
                        except Exception as e:
                            logger.error(f"Summary error: {e}")
                            await websocket.send_json({
                                "type": "error",
                                "code": "SUMMARY_FAILED",
                                "message": str(e)
                            })
                    else:
                        await websocket.send_json({
                            "type": "summary",
                            "text": "No transcript to summarize."
                        })
                        logger.info("No transcript to summarize")

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
