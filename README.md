<div align="center">

# 🎙️ VoiceScribe

**Real-Time Audio Transcription & AI Summarization Platform**

Record live audio or upload files → Whisper transcribes in 99+ languages → AI generates structured summaries

[![CI](https://github.com/yourusername/realtime-transcription/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/realtime-transcription/actions)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776AB.svg)](https://python.org)
[![React 19](https://img.shields.io/badge/react-19-61DAFB.svg)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## 📸 Features at a Glance

| Feature | Description |
|:---|:---|
| 🎤 **Live Transcription** | Real-time speech-to-text powered by OpenAI Whisper running locally |
| 📁 **File Upload** | Drag-and-drop audio/video files (MP3, WAV, M4A, MP4, etc.) for transcription |
| 🌐 **24+ Languages** | Built-in language selector with auto-detection — English, Spanish, Amharic, Chinese, and more |
| 🤖 **AI Summaries** | 4 formats: Meeting Notes, Email Draft, To-Do List, Key Decisions |
| 🌍 **Real-Time Translation** | Translate transcripts to any of 23 languages using Groq/Llama AI |
| 🔍 **Transcript Search** | Search within transcripts with real-time highlighting and match navigation |
| 🏷️ **Session Tags** | Tag recordings (Meeting, Lecture, Interview, etc.) with preset + custom tags |
| 🗣️ **Speaker Labels** | Manually assign color-coded speaker names to transcript chunks |
| 📖 **Custom Vocabulary** | Add domain-specific hotwords to improve Whisper accuracy |
| 📄 **PDF Export** | Download professional PDFs with metadata, transcript, and summary |
| 📋 **Session History** | Browse, search, filter by tag, view, and delete past recordings |
| 📊 **Analytics Dashboard** | Interactive charts: recordings/day, session duration, word frequency, tags pie chart |
| 🌙 **Dark Mode** | Polished dark theme with warm neutral colors |
| ⏸️ **Pause / Resume** | Pause recording without ending the session |
| 🎵 **Audio Playback** | Replay recorded audio after stopping |
| 📈 **Waveform Visualizer** | Real-time audio visualization while recording |
| ✏️ **Editable Transcript** | Click any chunk to correct transcription mistakes |
| ⬇️ **Export** | Download as TXT or copy to clipboard |
| ⌨️ **Keyboard Shortcuts** | `Space` = toggle recording, `Esc` = stop |
| 🔄 **Re-summarize** | Change format and regenerate summary on demand |
| ⚙️ **Settings** | Configure Whisper model, language, chunk interval, summary style, custom vocabulary |
| 🐳 **Docker Ready** | One-command deployment with Docker Compose |
| 🧪 **Tested** | Backend API tests with pytest + CI/CD pipeline |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌─────────┐ ┌───────────┐ ┌─────────┐ ┌─────────────┐ │
│  │ Landing  │ │ Dashboard │ │ History │ │  Analytics  │ │
│  │  Page    │ │  Record/  │ │  Page   │ │   Charts    │ │
│  │         │ │  Upload   │ │         │ │             │ │
│  └─────────┘ └─────┬─────┘ └────┬────┘ └──────┬──────┘ │
│                     │            │              │        │
│          WebSocket  │    REST API│       REST API│        │
└─────────────────────┼────────────┼──────────────┼────────┘
                      │            │              │
┌─────────────────────┼────────────┼──────────────┼────────┐
│                FastAPI Backend                           │
│  ┌──────────────┐ ┌─────────────┐ ┌───────────────────┐ │
│  │   Whisper    │ │  Groq API   │ │  SQLite + SQLAlch  │ │
│  │ (local STT)  │ │ (Llama 3.3) │ │   (persistence)   │ │
│  └──────────────┘ └─────────────┘ └───────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | React 19, Vite 8, React Router, Recharts |
| **Backend** | FastAPI, WebSockets, SQLAlchemy (async SQLite) |
| **Speech-to-Text** | OpenAI Whisper (runs locally, no API key needed) |
| **Summarization** | Groq API — Llama 3.3 70B Versatile |
| **DevOps** | Docker Compose, GitHub Actions CI |

---

## 📁 Project Structure

```
realtime-transcription/
├── frontend/
│   └── src/
│       ├── main.jsx                   # Entry (Router + Theme + Toast)
│       ├── App.jsx                    # React Router — 5 routes
│       ├── index.css                  # Design system (light/dark)
│       ├── context/
│       │   ├── ThemeContext.jsx        # Dark mode context
│       │   └── ToastContext.jsx        # Toast notifications
│       ├── components/
│       │   ├── Layout.jsx             # Sidebar navigation
│       │   ├── WaveformVisualizer.jsx  # Live audio waveform
│       │   ├── AudioPlayer.jsx         # Playback controls
│       │   ├── FileUpload.jsx          # Drag-and-drop upload
│       │   ├── ExportButtons.jsx       # Copy/download actions
│       │   └── ProgressSteps.jsx       # Step indicator
│       ├── hooks/
│       │   ├── useTranscription.js     # Core recording + WS logic
│       │   └── useKeyboardShortcuts.js # Space/Esc bindings
│       └── pages/
│           ├── LandingPage.jsx         # Hero + features
│           ├── DashboardPage.jsx       # Record / Upload + transcription
│           ├── HistoryPage.jsx         # Session list + detail modal
│           ├── AnalyticsPage.jsx       # Charts + stats
│           └── SettingsPage.jsx        # Configuration
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI + middleware
│   │   ├── config.py                  # Environment settings
│   │   ├── database.py                # SQLAlchemy async engine
│   │   ├── models.py                  # Session, Chunk, Summary
│   │   ├── routes.py                  # REST API (10 endpoints)
│   │   ├── websocket.py               # WebSocket transcription
│   │   ├── transcriber.py             # Whisper integration
│   │   └── summarizer.py              # Groq/Llama summarization
│   ├── tests/
│   │   └── test_routes.py             # API tests
│   └── requirements.txt
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## ⚡ Quick Start

### Prerequisites

| Requirement | Version |
|:---|:---|
| Node.js | 18+ |
| Python | 3.9+ |
| ffmpeg | Latest (`brew install ffmpeg` / `sudo apt install ffmpeg`) |
| Groq API Key | [console.groq.com](https://console.groq.com) |

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd realtime-transcription
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=gsk_your_key_here
```

### 3. Frontend

```bash
cd ../frontend
npm install
```

### 4. Run

**Terminal 1 — Backend:**

```bash
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**

```bash
cd frontend && npm run dev
```

Open **http://localhost:5173** 🎉

---

## 🐳 Docker

```bash
docker compose up --build
```

Open **http://localhost:3000**

---

## 🌐 Multi-Language Support

VoiceScribe supports **24+ languages** out of the box:

| Language | Code | Language | Code |
|:---|:---|:---|:---|
| 🇺🇸 English | `en` | 🇪🇹 Amharic | `am` |
| 🇪🇸 Spanish | `es` | 🇨🇳 Chinese | `zh` |
| 🇫🇷 French | `fr` | 🇯🇵 Japanese | `ja` |
| 🇩🇪 German | `de` | 🇰🇷 Korean | `ko` |
| 🇮🇹 Italian | `it` | 🇸🇦 Arabic | `ar` |
| 🇵🇹 Portuguese | `pt` | 🇮🇳 Hindi | `hi` |
| 🇷🇺 Russian | `ru` | 🇹🇷 Turkish | `tr` |

Select a language from the dropdown on the Dashboard, or leave it on **Auto-detect** to let Whisper identify the language automatically.

---

## 📡 API Reference

| Method | Endpoint | Description |
|:---|:---|:---|
| `WS` | `/ws/transcribe` | WebSocket for live transcription |
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/sessions/{id}` | Get session with transcript + summary |
| `PUT` | `/api/sessions/{id}` | Update session title |
| `DELETE` | `/api/sessions/{id}` | Delete a session |
| `POST` | `/api/transcribe-file` | Upload file for transcription (`?language=en`) |
| `POST` | `/api/resummarize` | Re-summarize with different format |
| `GET` | `/api/analytics` | Usage analytics and word frequency |
| `GET` | `/api/settings` | Get server settings |
| `PUT` | `/api/settings` | Update server settings |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---|:---|
| `Space` | Start / Stop recording |
| `Escape` | Stop recording |

---

## 🧪 Running Tests

```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -v
```

---

## 🔧 Configuration

All settings are configurable from the Settings page or via environment variables:

| Setting | Default | Description |
|:---|:---|:---|
| `GROQ_API_KEY` | — | Required. Groq API key for summarization |
| `WHISPER_MODEL` | `base` | Whisper model: `tiny`, `base`, `small`, `medium`, `large` |
| `LANGUAGE` | Auto | Transcription language code (e.g., `en`, `am`) |
| `DATABASE_URL` | SQLite | Database connection string |

---

## 🐛 Troubleshooting

| Problem | Solution |
|:---|:---|
| Whisper slow on first run | Model downloads once (~140MB for `base`), then cached |
| WebSocket error | Ensure backend is running on port 8000 before starting frontend |
| Microphone not working | Check browser permissions (lock icon in address bar) |
| Summary fails | Verify `GROQ_API_KEY` in `backend/.env` |
| File upload rejected | Ensure file is audio/video and under 50MB |
| Wrong language detected | Select the correct language from the Dashboard dropdown |

