import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { authFetch } from '../utils/authFetch';

const WHISPER_MODELS = [
  { value: 'tiny', label: 'Tiny (fastest, least accurate)' },
  { value: 'base', label: 'Base (default, balanced)' },
  { value: 'small', label: 'Small (better accuracy)' },
  { value: 'medium', label: 'Medium (high accuracy)' },
  { value: 'large', label: 'Large (best accuracy, slowest)' },
];

const LANGUAGES = [
  { value: '', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ru', label: 'Russian' },
  { value: 'am', label: 'Amharic' },
  { value: 'tr', label: 'Turkish' },
];

const SUMMARY_STYLES = [
  { value: 'meeting_notes', label: 'Meeting Notes' },
  { value: 'email_draft', label: 'Email Draft' },
  { value: 'todo_list', label: 'To-Do List' },
  { value: 'key_decisions', label: 'Key Decisions' },
];

const DEFAULT_SETTINGS = {
  whisperModel: 'base',
  language: '',
  chunkInterval: 4000,
  summaryStyle: 'meeting_notes',
  customVocabulary: '',
};

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('transcription-settings') || '{}');
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [slackWebhook, setSlackWebhook] = useState('');

  useEffect(() => {
    authFetch('http://localhost:8000/api/share/settings')
      .then(r => r.ok ? r.json() : {})
      .then(d => { if (d.slack_webhook_url) setSlackWebhook(d.slack_webhook_url); })
      .catch(() => {});
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('transcription-settings', JSON.stringify(next));
      return next;
    });
  };

  const saveToServer = async () => {
    try {
      await authFetch('http://localhost:8000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save to server (settings saved locally)');
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem('transcription-settings', JSON.stringify(DEFAULT_SETTINGS));
    toast.info('Settings reset to defaults');
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>⚙️ Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Configure your transcription preferences
        </p>
      </div>

      <div className="settings-grid">
        {/* Appearance */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🎨 Appearance</span>
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <strong>Theme</strong>
              <span>Toggle between light and dark mode</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>
        </div>

        {/* Transcription */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🎤 Transcription</span>
          </div>

          <div className="setting-row">
            <div className="setting-label">
              <strong>Whisper Model</strong>
              <span>Larger models are more accurate but slower</span>
            </div>
            <div className="setting-control">
              <select className="select" value={settings.whisperModel}
                onChange={e => updateSetting('whisperModel', e.target.value)}>
                {WHISPER_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-label">
              <strong>Language</strong>
              <span>Language of the audio (or auto-detect)</span>
            </div>
            <div className="setting-control">
              <select className="select" value={settings.language}
                onChange={e => updateSetting('language', e.target.value)}>
                {LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-label">
              <strong>Chunk Interval</strong>
              <span>How often to send audio chunks (ms)</span>
            </div>
            <div className="setting-control">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="range" min={2000} max={10000} step={1000}
                  value={settings.chunkInterval}
                  onChange={e => updateSetting('chunkInterval', parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 40 }}>
                  {settings.chunkInterval / 1000}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Vocabulary */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📖 Custom Vocabulary</span>
          </div>
          <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="setting-label" style={{ marginBottom: '0.5rem' }}>
              <strong>Hotwords & Special Terms</strong>
              <span>
                Add domain-specific words, product names, or jargon to improve transcription accuracy.
                Separate words with commas.
              </span>
            </div>
            <textarea
              className="input"
              rows={4}
              placeholder="e.g., VoiceScribe, FastAPI, Kubernetes, GPT-4, Llama 3, sprint backlog..."
              value={settings.customVocabulary}
              onChange={e => updateSetting('customVocabulary', e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', lineHeight: 1.6 }}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              These words are passed to Whisper as context to help it recognize uncommon terms.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">✨ Summary</span>
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <strong>Default Summary Style</strong>
              <span>The format AI uses for summaries</span>
            </div>
            <div className="setting-control">
              <select className="select" value={settings.summaryStyle}
                onChange={e => updateSetting('summaryStyle', e.target.value)}>
                {SUMMARY_STYLES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔗 Integrations</span>
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <strong>Slack Webhook URL</strong>
              <span>Paste your Slack Incoming Webhook URL to enable one-click sharing</span>
            </div>
            <div className="setting-control" style={{ width: '100%' }}>
              <input
                type="url"
                className="input"
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: '0.75rem' }}
            onClick={async () => {
              try {
                await authFetch('http://localhost:8000/api/share/settings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ slack_webhook_url: slackWebhook }),
                });
                toast.success('Slack webhook saved!');
              } catch (e) {
                toast.error('Failed to save webhook');
              }
            }}
          >💾 Save Webhook</button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={saveToServer}>💾 Save Settings</button>
          <button className="btn btn-ghost" onClick={resetSettings}>🔄 Reset to Defaults</button>
        </div>
      </div>
    </div>
  );
}
