import tempfile
import os
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.transcriber import transcribe_audio
from app.summarizer import summarize_transcript 

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/transcribe")
async def transcribe_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected")

    full_transcript = []
    
    try: 
        while True:
            message = await websocket.receive()

            # Case 1: Audio chunk arrived 
            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]
                logger.info(f"Received audio chunk: {len(audio_bytes)} bytes")

                # Save audio bytes to a temporary file
                with tempfile.NamedTemporaryFile(
                    suffix=".webm", delete=False
                ) as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = tmp.name
                
                try:
                    # Transcribe with Whisper in a thread pool 
                    # (CPU-heavy — must not block the async event loop)
                    loop = asyncio.get_event_loop()
                    text = await loop.run_in_executor(
                        None, transcribe_audio, tmp_path
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
                finally: 
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)

            # Case 2: Text command from the browser
            elif "text" in message and message["text"]:
                command = message["text"]
                logger.info(f"Received command: {command}")

                if command == "STOP":
                    if full_transcript:
                        combined = " ".join(full_transcript)
                        logger.info(f"Summarizing {len(full_transcript)} chunks...")
                        
                        await websocket.send_json({
                            "type": "status",
                            "text": "Generating summary..."
                        })
                        
                        summary = await summarize_transcript(combined)
                        await websocket.send_json({
                            "type": "summary",
                            "text": summary
                        })
                        logger.info("Summary sent")
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
