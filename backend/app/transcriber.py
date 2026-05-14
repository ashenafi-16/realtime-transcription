import whisper
import subprocess
import tempfile
import os

model = whisper.load_model("base")

def transcribe_audio(file_path: str) -> str:
    """
    Takes a path to a complete webm audio file.
    Converts to 16kHz mono WAV via ffmpeg, then transcribes with Whisper.
    """
    wav_path = None
    try:
        # Convert webm to wav using ffmpeg for reliable Whisper decoding
        wav_path = tempfile.mktemp(suffix=".wav")
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", file_path,
                "-ar", "16000",       # Whisper expects 16kHz
                "-ac", "1",           # mono
                "-f", "wav",
                wav_path
            ],
            capture_output=True,
            timeout=10
        )
        
        if result.returncode != 0:
            stderr = result.stderr.decode()
            print(f"FFmpeg error: {stderr[-200:]}")  # only last 200 chars
            return ""
        
        # Check that the wav file has actual content
        if not os.path.exists(wav_path) or os.path.getsize(wav_path) < 1000:
            return ""

        transcription = model.transcribe(wav_path, fp16=False, language="en")
        text = transcription["text"]
        print(f"Transcribed: {text[:80]}...")
        return text
    
    except Exception as e:
        print(f"Transcription error: {e}")
        return ""
    finally:
        # Clean up the wav file
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)