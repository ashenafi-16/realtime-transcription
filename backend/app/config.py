import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


class Settings:
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    LANGUAGE: str = os.getenv("LANGUAGE", "")  # empty = auto-detect
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./transcriptions.db")
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", 50 * 1024 * 1024))  # 50MB
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    JWT_ALGORITHM: str = "HS256"
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")


settings = Settings()
