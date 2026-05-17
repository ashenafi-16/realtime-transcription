"""
Chat schemas — Pydantic models for Q&A requests/responses.
"""
from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str
    session_id: int


class ChatResponse(BaseModel):
    answer: str
    message_id: int
