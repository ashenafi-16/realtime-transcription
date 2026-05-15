import React, { useState, useEffect, useRef } from 'react';
import { useTranscription } from '../hooks/useTranscription';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useToast } from '../context/ToastContext';
import WaveformVisualizer from '../components/WaveformVisualizer';
import AudioPlayer from '../components/AudioPlayer';
import ExportButtons from '../components/ExportButtons';
import ProgressSteps from '../components/ProgressSteps';
import FileUpload from '../components/FileUpload';

const SUMMARY_FORMATS = [
  { key: 'meeting_notes', label: '📝 Meeting Notes' },
  { key: 'email_draft', label: '✉️ Email Draft' },
  { key: 'todo_list', label: '✅ To-Do List' },
  { key: 'key_decisions', label: '🎯 Key Decisions' },
];

const LANGUAGES = [
  { value: '', label: '🌐 Auto-detect' },
  { value: 'en', label: '🇺🇸 English' },
  { value: 'es', label: '🇪🇸 Spanish' },
  { value: 'fr', label: '🇫🇷 French' },
  { value: 'de', label: '🇩🇪 German' },
  { value: 'it', label: '🇮🇹 Italian' },
  { value: 'pt', label: '🇵🇹 Portuguese' },
  { value: 'zh', label: '🇨🇳 Chinese' },
  { value: 'ja', label: '🇯🇵 Japanese' },
  { value: 'ko', label: '🇰🇷 Korean' },
  { value: 'ar', label: '🇸🇦 Arabic' },
  { value: 'hi', label: '🇮🇳 Hindi' },
  { value: 'ru', label: '🇷🇺 Russian' },
  { value: 'am', label: '🇪🇹 Amharic' },
  { value: 'tr', label: '🇹🇷 Turkish' },
  { value: 'nl', label: '🇳🇱 Dutch' },
  { value: 'pl', label: '🇵🇱 Polish' },
  { value: 'sv', label: '🇸🇪 Swedish' },
  { value: 'da', label: '🇩🇰 Danish' },
  { value: 'fi', label: '🇫🇮 Finnish' },
  { value: 'uk', label: '🇺🇦 Ukrainian' },
  { value: 'th', label: '🇹🇭 Thai' },
  { value: 'vi', label: '🇻🇳 Vietnamese' },
  { value: 'id', label: '🇮🇩 Indonesian' },
];

function formatElapsed(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function parseSummary(text) {
  if (!text) return { keyPoints: [], actionItems: [], raw: '' };
  const keyPoints = [];
  const actionItems = [];
  const lines = text.split('\n');
  let section = null;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('KEY POINTS:')) section = 'kp';
    else if (t.startsWith('ACTION ITEMS:')) section = 'ai';
    else if (t.startsWith('-') && section === 'kp') keyPoints.push(t.slice(1).trim());
    else if (t.startsWith('-') && section === 'ai') actionItems.push(t.slice(1).trim());
  }
  return { keyPoints, actionItems, raw: text };
}

export default function DashboardPage() {
  const {
    isRecording, isPaused, transcript, summary, status,
    sessionName, setSessionName, summaryFormat, setSummaryFormat,
    audioUrl, elapsedTime, streamingText, stream,
    startRecording, pauseRecording, resumeRecording, stopRecording,
    updateTranscriptChunk, resummarize,
  } = useTranscription();

  const toast = useToast();
  const bottomRef = useRef(null);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editText, setEditText] = useState('');
  const [mode, setMode] = useState('record'); // 'record' or 'upload'
  const [uploadTranscript, setUploadTranscript] = useState('');

  // Language state — persisted in localStorage
  const [language, setLanguage] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('transcription-settings') || '{}');
      return s.language || '';
    } catch { return ''; }
  });

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    try {
      const s = JSON.parse(localStorage.getItem('transcription-settings') || '{}');
      s.language = lang;
      localStorage.setItem('transcription-settings', JSON.stringify(s));
    } catch {}
  };

  useKeyboardShortcuts({ isRecording, startRecording, stopRecording, status });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    if (status === 'recording') toast.info('Recording started');
    if (status === 'done') toast.success('Summary ready!');
    if (status === 'error') toast.error('Something went wrong');
  }, [status]);

  const handleEditSave = (idx) => {
    updateTranscriptChunk(idx, editText);
    setEditingIdx(null);
    toast.success('Transcript updated');
  };

  const handleUploadResult = (text) => {
    setUploadTranscript(text);
  };

  // For file upload: summarize the uploaded transcript
  const summarizeUpload = async () => {
    if (!uploadTranscript.trim()) {
      toast.error('No transcript to summarize');
      return;
    }
    try {
      const res = await fetch('http://localhost:8000/api/resummarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: uploadTranscript, format: summaryFormat }),
      });
      if (!res.ok) throw new Error('Summary failed');
      const data = await res.json();
      toast.success('Summary generated!');
      setUploadTranscript(prev => prev + '\n\n---\n\n' + data.summary);
    } catch (err) {
      toast.error('Failed to summarize');
    }
  };

  const displaySummary = summary || streamingText;
  const parsed = parseSummary(displaySummary);

  // Current transcript display (for recording mode)
  const activeTranscript = transcript;

  return (
    <div className="fade-in">
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>🎙️ Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Record, upload, and transcribe in any language
          </p>
        </div>
        <ExportButtons transcript={transcript} summary={summary} />
      </div>

      {/* Mode Tabs + Language Selector Row */}
      <div className="dashboard-toolbar">
        {/* Mode Tabs */}
        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'record' ? 'active' : ''}`}
            onClick={() => setMode('record')}
          >
            <span>🎤</span> Live Recording
          </button>
          <button
            className={`mode-tab ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => setMode('upload')}
          >
            <span>📁</span> File Upload
          </button>
        </div>

        {/* Language Selector */}
        <div className="language-selector">
          <label className="language-label">🌐 Language:</label>
          <select
            className="select language-select"
            value={language}
            onChange={e => handleLanguageChange(e.target.value)}
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ══════════════ RECORD MODE ══════════════ */}
      {mode === 'record' && (
        <>
          <ProgressSteps status={status} />

          {/* Recorder Card */}
          <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <input
              className="session-name-input"
              placeholder="Name this session..."
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />

            {(isRecording || elapsedTime > 0) && (
              <div style={{ fontSize: '2rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isRecording ? 'var(--danger)' : 'var(--text-primary)', marginBottom: '0.75rem' }}>
                {formatElapsed(elapsedTime)}
              </div>
            )}

            {isRecording && <WaveformVisualizer stream={stream} isRecording={isRecording && !isPaused} />}

            {/* Language indicator during recording */}
            {isRecording && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Language: {language ? LANGUAGES.find(l => l.value === language)?.label : '🌐 Auto-detect'}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', margin: '1rem 0', flexWrap: 'wrap' }}>
              {!isRecording ? (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={startRecording}
                  disabled={status === 'processing'}
                >
                  ⏺ Start Recording
                </button>
              ) : (
                <>
                  {!isPaused ? (
                    <button className="btn btn-ghost btn-lg" onClick={pauseRecording}>
                      ⏸ Pause
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-lg" onClick={resumeRecording}>
                      ▶ Resume
                    </button>
                  )}
                  <button className="btn btn-danger btn-lg" onClick={stopRecording}>
                    ⏹ Stop
                  </button>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                background: status === 'recording' ? 'var(--danger)' : status === 'paused' ? 'var(--warning)' : status === 'done' ? 'var(--success)' : 'var(--text-muted)',
                animation: status === 'recording' ? 'pulse 1.5s infinite' : 'none',
              }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {status === 'idle' && 'Press Space or click to start recording'}
                {status === 'recording' && 'Recording... speak clearly'}
                {status === 'paused' && 'Paused — click Resume to continue'}
                {status === 'processing' && 'Generating summary...'}
                {status === 'done' && 'Done! Summary ready below'}
                {status === 'error' && 'Error occurred. Try again.'}
              </span>
            </div>

            {audioUrl && <div style={{ marginTop: '1rem' }}><AudioPlayer audioUrl={audioUrl} /></div>}

            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ⌨️ Space = Start/Stop &nbsp;|&nbsp; Esc = Stop
            </div>
          </div>

          {/* Transcript + Summary Grid */}
          <div className="dashboard-grid">
            {/* Transcript Panel */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📝 Live Transcript</span>
                {activeTranscript.length > 0 && <span className="badge">{activeTranscript.length} chunks</span>}
              </div>

              <div style={{ maxHeight: 350, overflowY: 'auto', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-color)' }}>
                {activeTranscript.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state-icon">🎤</span>
                    <p>{isRecording ? 'Listening... start speaking' : 'Transcript appears here once you start recording'}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {activeTranscript.map((chunk, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.5rem 0.6rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                        className="fade-in">
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', minWidth: 20, marginTop: 3 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {editingIdx === i ? (
                          <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                            <input className="input" value={editText} onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleEditSave(i)}
                              autoFocus style={{ flex: 1 }} />
                            <button className="btn btn-primary btn-sm" onClick={() => handleEditSave(i)}>✓</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingIdx(null)}>✕</button>
                          </div>
                        ) : (
                          <p style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6, cursor: 'pointer' }}
                            onClick={() => { setEditingIdx(i); setEditText(chunk); }}
                            title="Click to edit">
                            {chunk}
                          </p>
                        )}
                      </div>
                    ))}
                    {isRecording && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1.5s infinite', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Listening...</span>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Summary Panel */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">✨ AI Summary</span>
              </div>

              <div className="format-selector" style={{ marginBottom: '1rem' }}>
                {SUMMARY_FORMATS.map(f => (
                  <button
                    key={f.key}
                    className={`format-chip ${summaryFormat === f.key ? 'active' : ''}`}
                    onClick={() => setSummaryFormat(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {status === 'processing' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div className="spinner" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {streamingText ? 'Generating...' : 'Analyzing your transcript...'}
                  </p>
                  {streamingText && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', textAlign: 'left', width: '100%' }}>
                      {streamingText}
                    </p>
                  )}
                </div>
              ) : !displaySummary ? (
                <div className="empty-state">
                  <span className="empty-state-icon">🤖</span>
                  <p>AI summary will appear here after recording</p>
                </div>
              ) : (
                <div>
                  {parsed.keyPoints.length > 0 && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderTop: '3px solid var(--accent)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span>💡</span>
                        <strong style={{ flex: 1, fontSize: '0.9rem' }}>Key Points</strong>
                        <span className="badge">{parsed.keyPoints.length}</span>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {parsed.keyPoints.map((p, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsed.actionItems.length > 0 && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderTop: '3px solid var(--success)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span>✅</span>
                        <strong style={{ flex: 1, fontSize: '0.9rem' }}>Action Items</strong>
                        <span className="badge badge-success">{parsed.actionItems.length}</span>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {parsed.actionItems.map((a, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', marginTop: 6, flexShrink: 0 }} />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsed.keyPoints.length === 0 && parsed.actionItems.length === 0 && (
                    <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                      {displaySummary}
                    </div>
                  )}

                  {status === 'done' && (
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }}
                      onClick={() => resummarize(summaryFormat)}>
                      🔄 Re-summarize
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════ UPLOAD MODE ══════════════ */}
      {mode === 'upload' && (
        <div style={{ marginTop: '0.5rem' }}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <span className="card-title">📁 Upload Audio/Video File</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Upload a pre-recorded audio or video file for transcription.
              {language ? ` Language: ${LANGUAGES.find(l => l.value === language)?.label}` : ' Language will be auto-detected.'}
            </p>
            <FileUpload language={language} onTranscriptResult={handleUploadResult} />
          </div>

          {/* Upload Result */}
          {uploadTranscript && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">📝 Transcription Result</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    navigator.clipboard.writeText(uploadTranscript);
                    toast.success('Copied to clipboard');
                  }}>
                    📋 Copy
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const blob = new Blob([uploadTranscript], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `transcription-${new Date().toISOString().slice(0, 10)}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Downloaded');
                  }}>
                    ⬇️ Download
                  </button>
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.25rem', border: '1px solid var(--border-color)', fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 400, overflowY: 'auto' }}>
                {uploadTranscript}
              </div>

              {/* Summary format + generate */}
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className="format-selector">
                  {SUMMARY_FORMATS.map(f => (
                    <button
                      key={f.key}
                      className={`format-chip ${summaryFormat === f.key ? 'active' : ''}`}
                      onClick={() => setSummaryFormat(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" onClick={summarizeUpload}>
                  ✨ Generate Summary
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
