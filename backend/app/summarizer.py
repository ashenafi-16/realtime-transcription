import os 
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def summarize_transcript(transcript: str) -> str:
    """
    Takes the full transcript as a string. 
    Returns a structured summary with key points and action items.
    """
    try:
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1024,
            messages = [
                {
                    "role": "user",
                    "content": f"""You are a helpful assistant that summarizes meeting transcripts.
                    Analyze the following transcript and return a clear, structured summary.

                    Format your response exactly like this:

                    KEY POINTS:
                    - [key point 1]
                    - [key point 2]
                    - [key point 3]

                    ACTION ITEMS:
                    - [action item 1]
                    - [action item 2]

                    TRANSCRIPT:
                    {transcript}
                    """
                }
            ]
        )
        return message.content[0].text
    except Exception as e:
        print(f"Summarization error: {e}")
        return "Summary could not be generated. Please check your API key."