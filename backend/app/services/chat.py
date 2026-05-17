"""
Chat service — Transcript Q&A using Groq/Llama.
"""
import logging
from app.config import settings
from groq import Groq

logger = logging.getLogger(__name__)

client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = """You are a helpful AI assistant answering questions about an audio transcript.
You have been given the full transcript below. Answer the user's questions based ONLY on the
information found in the transcript. If the transcript doesn't contain enough information to
answer, say so clearly. Be concise and accurate.

TRANSCRIPT:
{transcript}"""


async def ask_transcript(
    transcript_text: str,
    question: str,
    history: list[dict] | None = None,
) -> str:
    """
    Ask a question about a transcript using Groq/Llama.

    Args:
        transcript_text: The full transcript text
        question: The user's question
        history: Previous conversation messages [{"role": "user/assistant", "content": "..."}]
    Returns:
        AI answer string
    """
    try:
        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT.format(transcript=transcript_text[:8000]),
            }
        ]

        # Add conversation history (last 6 messages for context window)
        if history:
            for msg in history[-6:]:
                messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({"role": "user", "content": question})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=1024,
            messages=messages,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Chat Q&A error: {e}")
        return "Sorry, I couldn't process your question. Please try again."
