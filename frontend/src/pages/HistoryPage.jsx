import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8000/api';

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API}/sessions`);
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

  useEffect(() => { fetchSessions(); }, []);

  const viewSession = async (id) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/sessions/${id}`);
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
      await fetch(`${API}/sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

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

      {/* Search Bar */}
      <div className="search-bar" style={{ marginBottom: '1rem' }}>
        <span className="search-bar-icon">🔍</span>
        <input
          className="input"
          placeholder="Search sessions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
                  <th>Date</th>
                  <th>Chunks</th>
                  <th>Duration</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.title || 'Untitled Session'}
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
                        <button className="btn btn-ghost btn-sm" onClick={() => viewSession(s.id)}>
                          👁️
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteSession(s.id)}
                          style={{ color: 'var(--danger)' }}>
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
                <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(selected.created_at).toLocaleString()}
                </div>

                {/* Transcript */}
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>📝 Transcript</h3>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1rem', maxHeight: 200, overflowY: 'auto', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {selected.chunks && selected.chunks.length > 0 ? (
                    selected.chunks.map((c, i) => (
                      <p key={i} style={{ marginBottom: '0.5rem' }}>
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
