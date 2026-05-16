import logging
from app.config import settings
from groq import Groq

logger = logging.getLogger(__name__)

client = Groq(api_key=settings.GROQ_API_KEY)

# ── Summary format prompts ──
FORMAT_PROMPTS = {
    "meeting_notes": """Analyze the following transcript and return a clear, structured summary.

Format your response exactly like this:

KEY POINTS:
- [key point 1]
- [key point 2]
- [key point 3]

ACTION ITEMS:
- [action item 1]
- [action item 2]""",

    "email_draft": """Convert the following transcript into a professional email draft.
Include a subject line, greeting, body with key points, and a professional closing.
Keep it concise and actionable.""",

    "todo_list": """Extract all tasks, action items, and to-dos from the following transcript.
Format as a numbered checklist:

1. [ ] Task description
2. [ ] Task description
...""",

    "key_decisions": """Identify and summarize all key decisions made in this transcript.

Format your response as:

DECISIONS MADE:
- [decision 1]: [brief context]
- [decision 2]: [brief context]

PENDING DECISIONS:
- [item needing decision]: [context]

NEXT STEPS:
- [step 1]
- [step 2]""",
}

# ── Language names for translation ──
LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French", "de": "German",
    "it": "Italian", "pt": "Portuguese", "zh": "Chinese", "ja": "Japanese",
    "ko": "Korean", "ar": "Arabic", "hi": "Hindi", "ru": "Russian",
    "am": "Amharic", "tr": "Turkish", "nl": "Dutch", "pl": "Polish",
    "sv": "Swedish", "da": "Danish", "fi": "Finnish", "uk": "Ukrainian",
    "th": "Thai", "vi": "Vietnamese", "id": "Indonesian",
}


async def summarize_transcript(transcript: str, format_type: str = "meeting_notes") -> str:
    """
    Summarize transcript using Groq (Llama 3).

    Args:
        transcript: Full transcript text
        format_type: One of meeting_notes, email_draft, todo_list, key_decisions
    """
    try:
        prompt = FORMAT_PROMPTS.get(format_type, FORMAT_PROMPTS["meeting_notes"])

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=1024,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that summarizes meeting transcripts. Be concise and well-structured."
                },
                {
                    "role": "user",
                    "content": f"{prompt}\n\nTRANSCRIPT:\n{transcript}"
                }
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        return "Summary could not be generated. Please check your API key."


async def translate_text(text: str, target_language: str) -> str:
    """
    Translate text to a target language using Groq (Llama 3).

    Args:
        text: Text to translate
        target_language: Language code (e.g. 'es', 'fr', 'am')
    """
    lang_name = LANGUAGE_NAMES.get(target_language, target_language)
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=2048,
            messages=[
                {
                    "role": "system",
                    "content": f"You are a professional translator. Translate the following text accurately into {lang_name}. Only output the translated text, no explanations."
                },
                {
                    "role": "user",
                    "content": text
                }
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return f"Translation to {lang_name} failed. Please check your API key."