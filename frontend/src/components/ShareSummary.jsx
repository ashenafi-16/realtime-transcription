import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import { useToast } from '../context/ToastContext';

export default function ShareSummary({ summary, sessionTitle }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('email');
  const [emailInput, setEmailInput] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [savedEmails, setSavedEmails] = useState([]);
  const [subject, setSubject] = useState(`VoiceScribe — ${sessionTitle || 'Session Summary'}`);
  const [sending, setSending] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) loadSavedEmails();
  }, [open]);

  const loadSavedEmails = async () => {
    try {
      const res = await authFetch('http://localhost:8000/api/share/emails');
      if (res.ok) {
        const data = await res.json();
        setSavedEmails(data);
      }
    } catch (e) { /* ignore */ }
  };

  const addRecipient = (email) => {
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !/\S+@\S+\.\S+/.test(cleaned)) {
      toast.error('Invalid email address');
      return;
    }
    if (recipients.includes(cleaned)) return;
    setRecipients([...recipients, cleaned]);
    setEmailInput('');
  };

  const removeRecipient = (email) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const saveEmail = async (email) => {
    try {
      await authFetch('http://localhost:8000/api/share/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      loadSavedEmails();
      toast.success('Email saved');
    } catch (e) { toast.error('Failed to save email'); }
  };

  const deleteSavedEmail = async (id) => {
    try {
      await authFetch(`http://localhost:8000/api/share/emails/${id}`, { method: 'DELETE' });
      setSavedEmails(savedEmails.filter(e => e.id !== id));
    } catch (e) { toast.error('Failed to delete'); }
  };

  const sendEmail = async () => {
    if (recipients.length === 0) { toast.error('Add at least one recipient'); return; }
    setSending(true);
    try {
      const res = await authFetch('http://localhost:8000/api/share/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          subject,
          summary,
          session_title: sessionTitle || 'Untitled Session',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Send failed');
      }
      toast.success(`Summary sent to ${recipients.length} recipient(s)!`);
      // Auto-save new emails
      for (const r of recipients) {
        if (!savedEmails.some(s => s.email === r)) saveEmail(r);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const sendSlack = async () => {
    setSending(true);
    try {
      const res = await authFetch('http://localhost:8000/api/share/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          session_title: sessionTitle || 'Untitled Session',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Slack send failed');
      }
      toast.success('Summary sent to Slack!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  if (!summary) return null;

  return (
    <div className="share-panel">
      <button
        className="share-toggle"
        onClick={() => setOpen(!open)}
      >
        <span>📤 Share Summary</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>

      {open && (
        <div className="share-content">
          {/* Tab Switcher */}
          <div className="share-tabs">
            <button
              className={`share-tab ${tab === 'email' ? 'active' : ''}`}
              onClick={() => setTab('email')}
            >
              ✉️ Email
            </button>
            <button
              className={`share-tab ${tab === 'slack' ? 'active' : ''}`}
              onClick={() => setTab('slack')}
            >
              💬 Slack
            </button>
          </div>

          {/* Email Tab */}
          {tab === 'email' && (
            <div className="share-tab-body">
              {/* Subject */}
              <div className="share-field">
                <label>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="share-input"
                />
              </div>

              {/* Recipients */}
              <div className="share-field">
                <label>Recipients</label>
                <div className="email-chips">
                  {recipients.map(r => (
                    <span key={r} className="email-chip">
                      {r}
                      <button onClick={() => removeRecipient(r)}>✕</button>
                    </span>
                  ))}
                </div>
                <div className="email-input-row">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(emailInput); } }}
                    placeholder="name@example.com"
                    className="share-input"
                  />
                  <button className="btn btn-ghost btn-sm" onClick={() => addRecipient(emailInput)}>Add</button>
                </div>
              </div>

              {/* Saved Emails */}
              {savedEmails.length > 0 && (
                <div className="share-field">
                  <label>Saved Emails</label>
                  <div className="saved-emails">
                    {savedEmails.map(s => (
                      <div key={s.id} className="saved-email-item">
                        <button
                          className="saved-email-add"
                          onClick={() => addRecipient(s.email)}
                          title="Add to recipients"
                        >
                          + {s.email}
                        </button>
                        <button
                          className="saved-email-del"
                          onClick={() => deleteSavedEmail(s.id)}
                          title="Remove saved"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={sendEmail}
                disabled={sending || recipients.length === 0}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {sending ? '⏳ Sending...' : `✉️ Send to ${recipients.length} recipient(s)`}
              </button>
            </div>
          )}

          {/* Slack Tab */}
          {tab === 'slack' && (
            <div className="share-tab-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Configure your Slack Incoming Webhook URL in <strong>Settings → Integrations</strong>, then click below to send.
              </p>
              <button
                className="btn btn-primary slack-btn"
                onClick={sendSlack}
                disabled={sending}
                style={{ width: '100%' }}
              >
                {sending ? '⏳ Sending...' : '💬 Send to Slack'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
