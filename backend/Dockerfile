# ---- Backend Dockerfile ----
# Python 3.11 slim + ffmpeg + OpenAI Whisper + FastAPI

FROM python:3.11-slim

# Install system dependencies (ffmpeg is required by Whisper)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Pre-download the Whisper "base" model so the first request isn't slow
RUN python -c "import whisper; whisper.load_model('base')"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
