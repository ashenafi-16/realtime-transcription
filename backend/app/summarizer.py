import os
import logging
from dotenv import load_dotenv
from groq import Groq

logger = logging.getLogger(__name__)

# Load from backend/.env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


async def summarize_transcript(transcript: str) -> str:
    """
    Takes the full transcript as a string.
    Returns a structured summary with key points and action items using Groq (Llama 3).
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=1024,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that summarizes meeting transcripts."
                },
                {
                    "role": "user",
                    "content": f"""Analyze the following transcript and return a clear, structured summary.

Format your response exactly like this:

KEY POINTS:
- [key point 1]
- [key point 2]
- [key point 3]

ACTION ITEMS:
- [action item 1]
- [action item 2]

TRANSCRIPT:
{transcript}"""
                }
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        return "Summary could not be generated. Please check your API key."