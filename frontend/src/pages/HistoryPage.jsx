import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { authFetch } from '../utils/authFetch';

const API = 'http://localhost:8000/api';

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const toast = useToast();

  const fetchSessions = async () => {
    try {
      const url = filterTag ? `${API}/sessions?tag=${filterTag}` : `${API}/sessions`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, [filterTag]);

  const viewSession = async (id) => {
    setDetailLoading(true);
    try {
      const res = await authFetch(`${API}/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelected(data);
      }
    } catch (err) {
      console.error('Failed to fetch session:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteSession = async (id) => {
    if (!confirm('Delete this session?')) return;
    try {
      await authFetch(`${API}/sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success('Session deleted');
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const downloadPdf = async (id, title) => {
    try {
      const token = localStorage.getItem('voicescribe-token') || '';
      const res = await fetch(`${API}/export/pdf/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(title || 'session').replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.info('Downloading PDF...');
    } catch (err) {
      toast.error('PDF download failed');
    }
  };

  // Get all unique tags from sessions
  const allTags = [...new Set(sessions.flatMap(s => s.tags || []))].sort();

  const filtered = sessions.filter(s =>
    (s.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>📋 History</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Browse and manage your past recording sessions
        </p>
      </div>

      {/* Search + Tag Filter */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <span className="search-bar-icon">🔍</span>
          <input className="input" placeholder="Search sessions..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>🏷️</span>
            <button className={`tag-filter-btn ${filterTag === '' ? 'active' : ''}`}
              onClick={() => setFilterTag('')}>All</button>
            {allTags.map(t => (
              <button key={t} className={`tag-filter-btn ${filterTag === t ? 'active' : ''}`}
                onClick={() => setFilterTag(t)}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📭</span>
          <p>{sessions.length === 0 ? 'No recordings yet. Go to Dashboard to start recording!' : 'No sessions match your search.'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Tags</th>
                  <th>Date</th>
                  <th>Chunks</th>
                  <th>Duration</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.title || 'Untitled Session'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {(s.tags || []).map(t => (
                          <span key={t} className="tag-chip-sm">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td><span className="badge">{s.chunk_count || 0}</span></td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {s.duration ? `${Math.floor(s.duration / 60)}m ${s.duration % 60}s` : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => viewSession(s.id)} title="View">
                          👁️
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => downloadPdf(s.id, s.title)} title="PDF">
                          📄
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteSession(s.id)}
                          style={{ color: 'var(--danger)' }} title="Delete">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.title || 'Untitled Session'}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            {detailLoading ? (
              <div className="empty-state"><div className="spinner" /></div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(selected.created_at).toLocaleString()}
                  </span>
                  {selected.language && (
                    <span className="badge">{selected.language.toUpperCase()}</span>
                  )}
                  {(selected.tags || []).map(t => (
                    <span key={t} className="tag-chip-sm">{t}</span>
                  ))}
                </div>

                {/* Transcript */}
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>📝 Transcript</h3>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1rem', maxHeight: 200, overflowY: 'auto', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {selected.chunks && selected.chunks.length > 0 ? (
                    selected.chunks.map((c, i) => (
                      <p key={i} style={{ marginBottom: '0.5rem' }}>
                        {c.speaker && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem' }}>[{c.speaker}] </span>}
                        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.75rem' }}>{String(i + 1).padStart(2, '0')}</span>{' '}
                        {c.text}
                      </p>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>No transcript</p>
                  )}
                </div>

                {/* Summary */}
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>✨ Summary</h3>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '1rem', fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {selected.summary || <span style={{ color: 'var(--text-muted)' }}>No summary</span>}
                </div>

                {/* PDF Download */}
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => downloadPdf(selected.id, selected.title)}>
                    📄 Download PDF
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const text = (selected.chunks || []).map(c => c.text).join('\n');
                    navigator.clipboard.writeText(text);
                    toast.success('Transcript copied');
                  }}>📋 Copy Transcript</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
