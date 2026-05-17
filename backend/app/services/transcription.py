import whisper
import subprocess
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

# Cache loaded models
_models = {}


def _get_model(model_name: str = "base"):
    """Load and cache a Whisper model."""
    if model_name not in _models:
        logger.info(f"Loading Whisper model: {model_name}")
        _models[model_name] = whisper.load_model(model_name)
    return _models[model_name]


# Pre-load default model
_get_model("base")


def transcribe_audio(file_path: str, language: str = None, initial_prompt: str = "") -> str:
    """
    Takes a path to an audio file.
    Converts to 16kHz mono WAV via ffmpeg, then transcribes with Whisper.
    
    Args:
        file_path: Path to audio file
        language: Language code (e.g. 'en', 'es') or None for auto-detect
        initial_prompt: Custom vocabulary / context to guide Whisper
    """
    wav_path = None
    try:
        wav_path = tempfile.mktemp(suffix=".wav")
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", file_path,
                "-ar", "16000",
                "-ac", "1",
                "-f", "wav",
                wav_path
            ],
            capture_output=True,
            timeout=30
        )

        if result.returncode != 0:
            stderr = result.stderr.decode()
            logger.error(f"FFmpeg error: {stderr[-300:]}")
            return ""

        if not os.path.exists(wav_path) or os.path.getsize(wav_path) < 1000:
            return ""

        model = _get_model("base")

        # Build transcription kwargs
        kwargs = {"fp16": False}
        if language:
            kwargs["language"] = language
        if initial_prompt:
            kwargs["initial_prompt"] = initial_prompt

        transcription = model.transcribe(wav_path, **kwargs)
        text = transcription["text"]
        detected_lang = transcription.get("language", "unknown")
        logger.info(f"Transcribed ({detected_lang}): {text[:80]}...")
        return text

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return ""
    finally:
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)