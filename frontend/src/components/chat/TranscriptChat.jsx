import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { authFetch } from '../../utils/authFetch';
import ChatMessage from './ChatMessage';

const API = 'http://localhost:8000/api';

export default function TranscriptChat({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const toast = useToast();

  // Load chat history when opened
  useEffect(() => {
    if (!isOpen || !sessionId) return;
    setHistoryLoading(true);
    authFetch(`${API}/chat/${sessionId}`)
      .then(r => r.ok ? r.json() : [])
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoading(false));
  }, [isOpen, sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = async () => {
    if (!question.trim() || loading) return;

    const userMsg = { role: 'user', content: question, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await authFetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), session_id: sessionId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to get response');
      }

      const data = await res.json();
      setMessages(prev => [...prev, {
        id: data.message_id,
        role: 'assistant',
        content: data.answer,
        created_at: new Date().toISOString(),
      }]);
    } catch (err) {
      toast.error(err.message);
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Clear all chat history for this session?')) return;
    try {
      await authFetch(`${API}/chat/${sessionId}`, { method: 'DELETE' });
      setMessages([]);
      toast.success('Chat history cleared');
    } catch {
      toast.error('Failed to clear history');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-panel-wrapper">
      {/* Toggle Button */}
      <button
        className={`chat-toggle-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Ask about this transcript"
      >
        <span>💬</span>
        <span className="chat-toggle-label">Ask AI</span>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div className="chat-panel-title">
              <span>🤖</span>
              <span>Transcript Q&A</span>
            </div>
            <div className="chat-panel-actions">
              {messages.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={clearHistory} title="Clear history">
                  🗑️
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setIsOpen(false)} title="Close">
                ✕
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {historyLoading ? (
              <div className="chat-loading">
                <div className="spinner" />
                <p>Loading chat history...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-empty">
                <span style={{ fontSize: '2.5rem' }}>🎙️</span>
                <h3>Ask about this transcript</h3>
                <p>Ask questions like:</p>
                <div className="chat-suggestions">
                  {[
                    'What are the main topics discussed?',
                    'Summarize the key decisions made',
                    'Who said what about the deadline?',
                    'List all action items mentioned',
                  ].map((s, i) => (
                    <button key={i} className="chat-suggestion-btn"
                      onClick={() => { setQuestion(s); inputRef.current?.focus(); }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => <ChatMessage key={i} message={msg} />)
            )}

            {loading && (
              <div className="chat-bubble chat-bubble-ai">
                <div className="chat-bubble-header">
                  <span className="chat-bubble-avatar">🤖</span>
                  <span className="chat-bubble-role">AI Assistant</span>
                </div>
                <div className="chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="input chat-input"
              placeholder="Ask a question about the transcript..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="btn btn-primary chat-send-btn"
              onClick={sendMessage}
              disabled={!question.trim() || loading}
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
