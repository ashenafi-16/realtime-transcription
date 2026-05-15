import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🎤',
    title: 'Live Transcription',
    desc: 'Record audio in your browser and get real-time transcription powered by OpenAI Whisper.',
  },
  {
    icon: '🤖',
    title: 'AI Summaries',
    desc: 'Automatically generate key points and action items using AI when you finish recording.',
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    desc: 'Track your recording history with charts, word frequency analysis, and session stats.',
  },
  {
    icon: '🌐',
    title: 'Multi-Language',
    desc: 'Transcribe in any language. Whisper supports 99+ languages with automatic detection.',
  },
  {
    icon: '📁',
    title: 'File Upload',
    desc: 'Upload pre-recorded audio or video files for transcription — not just live recordings.',
  },
  {
    icon: '🌙',
    title: 'Dark Mode',
    desc: 'Beautiful dark and light themes with a one-click toggle. Easy on the eyes, day or night.',
  },
];

export default function LandingPage() {
  return (
    <div className="fade-in">
      {/* Hero */}
      <div className="landing-hero">
        <h1>
          Record. Transcribe.{' '}
          <span className="gradient-text">Summarize.</span>
        </h1>
        <p>
          Turn any meeting, lecture, or conversation into searchable text with
          AI-powered summaries — all in real time, right in your browser.
        </p>
        <Link to="/dashboard" className="btn btn-primary btn-lg">
          🎙️ Start Recording
        </Link>
      </div>

      {/* Features */}
      <div className="features-grid">
        {FEATURES.map((f, i) => (
          <div key={i} className="feature-card">
            <div className="feature-card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
