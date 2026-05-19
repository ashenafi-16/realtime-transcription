# ---- Backend Dockerfile ----
# Python 3.11 slim + ffmpeg + OpenAI Whisper + FastAPI

FROM python:3.11-slim

# Install system dependencies (ffmpeg is required by Whisper)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python -c "import whisper; whisper.load_model('base')"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
