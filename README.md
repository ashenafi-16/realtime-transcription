# 🎙️ Real-Time Transcription Dashboard

Record audio in your browser → Whisper transcribes it live → Claude summarizes key points and action items.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI + WebSockets |
| Speech-to-Text | OpenAI Whisper (runs locally) |
| Summarization | Anthropic Claude API |

---

## Prerequisites

- Node.js v18+
- Python 3.9+
- ffmpeg — `brew install ffmpeg` (Mac) / `sudo apt install ffmpeg` (Ubuntu)
- Anthropic API key → [console.anthropic.com](https://console.anthropic.com)

---

## Project Structure

```
transcription-dashboard/
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── Recorder.jsx
│       │   ├── Transcript.jsx
│       │   └── Summary.jsx
│       └── hooks/
│           └── useTranscription.js
└── backend/
    └── app/
        ├── main.py
        ├── websocket.py
        ├── transcriber.py
        └── summarizer.py
```

---

## Setup

### 1. Clone and enter the project
```bash
git clone <your-repo-url>
cd transcription-dashboard
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
ANTHROPIC_API_KEY=your_key_here
```

### 3. Frontend
```bash
cd ../frontend
npm install
```

---

## Running the App

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Usage

1. Click **⏺ Start Recording** and allow microphone access
2. Speak — transcript updates every 2 seconds
3. Click **⏹ Stop Recording**
4. Claude generates **Key Points** and **Action Items**

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Whisper slow on first run | Downloads model (~140MB) once, then cached |
| WebSocket error | Ensure backend is running before starting frontend |
| Mic not working | Check browser permissions (lock icon in address bar) |
| Summary fails | Verify `ANTHROPIC_API_KEY` in `backend/.env` |