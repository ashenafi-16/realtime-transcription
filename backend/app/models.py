import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), default="Untitled Session")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    duration = Column(Integer, default=0)  # seconds

    chunks = relationship("TranscriptChunk", back_populates="session", cascade="all, delete-orphan", order_by="TranscriptChunk.index")
    summary = relationship("Summary", back_populates="session", uselist=False, cascade="all, delete-orphan")


class TranscriptChunk(Base):
    __tablename__ = "transcript_chunks"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="chunks")


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    text = Column(Text, nullable=False)

    session = relationship("Session", back_populates="summary")
