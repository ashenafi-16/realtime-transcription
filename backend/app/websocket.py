import tempfile
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.transcriber import transcribe_audio
from app.summarizer import summarize_transcript 

router = APIRouter()

@router.websocket("/ws/transcribe")
async def transcribe_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client cconnected")

    full_transcript = []
    
    try: 
        while True:
            # Receive a message from the browser
            message = await websocket.receive()

            # case 1: audio chunk arrived 
            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]

                # Save the audio bytes to a temporary file
                with tempfile.NamedTemporaryFile(
                    suffix=".webm", delete=False
                ) as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = tmp.name
                
                try:
                    # Transcribe the chunk with Whisper
                    text  = transcribe_audio(tmp_path)

                    if text.strip():
                        full_transcript.append(text.strip())

                        # send transcript text back to the browser
                        await websocket.send_json({
                            "type": "transcript",
                            "text": text.strip()
                        })
                finally: 
                    # always clean up the temp file
                    os.unlink(tmp_path)

            # case 2: Browser sent a text command
            elif "text" in message and message["text"]:
                command = message["text"]

                if command == "STOP":
                    # user stopped recording, summarize everything

                    if full_transcript:
                        combined = " ".join(full_transcript)
                        await websocket.send_json({
                            "type": "status",
                            "text": "Generating summary..."
                        })
                        
                        summary = await summarize_transcript(combined)
                        await websocket.send_json({
                            "type": "summary",
                            "text": summary
                        })
                    else:
                        await websocket.send_json({
                            "type": "summary",
                            "text": "No transcript to summarize."
                        })
    except WebSocketDisconnect:
        print("Client disconnected")

