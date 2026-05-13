import whisper

model = whisper.load_model("base")

def transcribe_audio(file_path: str) -> str:
    # takes a path to an audio file(.webm, .wav, .mp3, etc) returns the transcribed text as a string.
    try:
        result = model.transcribe(file_path, fp16=False)
        return result["text"]
    
    except Exception as e:
        print(f"Transcription error: {e}")
        return ""