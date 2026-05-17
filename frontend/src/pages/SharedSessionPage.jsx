import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API = 'http://localhost:8000/api';

const SPEAKER_COLORS = [
  '#7c3aed', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6',
];

export default function SharedSessionPage() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/shared/${token}`)
      .then(r => {
        if (!r.ok) throw new Error('Session not found');
        return r.json();
      })
      .then(setSession)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="shared-page">
      <div className="shared-loading">
        <div className="spinner" />
        <p>Loading shared session...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="shared-page">
      <div className="shared-error">
        <span style={{ fontSize: '3rem' }}>🔗</span>
        <h2>Session Not Found</h2>
        <p>This share link may have been revoked or doesn't exist.</p>
      </div>
    </div>
  );

  const speakers = [...new Set(session.chunks.map(c => c.speaker).filter(Boolean))];

  return (
    <div className="shared-page">
      <div className="shared-container">
        {/* Header */}
        <div className="shared-header">
          <div className="shared-brand">
            <span style={{ fontSize: '1.5rem' }}>🎙️</span>
            <span>VoiceScribe</span>
          </div>
          <div className="shared-badge">Shared Session</div>
        </div>

        {/* Session Info */}
        <div className="shared-info">
          <h1>{session.title || 'Untitled Session'}</h1>
          <div className="shared-meta">
            {session.created_at && (
              <span>📅 {new Date(session.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            )}
            {session.duration > 0 && (
              <span>⏱️ {Math.floor(session.duration / 60)}m {session.duration % 60}s</span>
            )}
            {session.language && <span>🌐 {session.language.toUpperCase()}</span>}
          </div>
          {session.tags?.length > 0 && (
            <div className="shared-tags">
              {session.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="shared-section">
          <h2>📝 Transcript</h2>
          <div className="shared-transcript">
            {session.chunks.map((chunk, i) => (
              <div key={i} className="shared-chunk">
                {chunk.speaker && (
                  <span className="chunk-speaker" style={{
                    color: SPEAKER_COLORS[speakers.indexOf(chunk.speaker) % SPEAKER_COLORS.length]
                  }}>
                    {chunk.speaker}
                  </span>
                )}
                <span className="chunk-text">{chunk.text}</span>
              </div>
            ))}
            {session.chunks.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No transcript available</p>
            )}
          </div>
        </div>

        {/* Summary */}
        {session.summary && (
          <div className="shared-section">
            <h2>✨ AI Summary</h2>
            <div className="shared-summary">
              {session.summary}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="shared-footer">
          <p>Powered by <strong>VoiceScribe</strong> — Real-Time Transcription & AI Summarization</p>
        </div>
      </div>
    </div>
  );
}
