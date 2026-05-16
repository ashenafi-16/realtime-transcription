import React, { useState, useMemo } from 'react';

export default function TranscriptSearch({ transcript, onJumpTo }) {
  const [query, setQuery] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);

  const matches = useMemo(() => {
    if (!query.trim() || !transcript.length) return [];
    const q = query.toLowerCase();
    const result = [];
    transcript.forEach((chunk, i) => {
      const text = (typeof chunk === 'string' ? chunk : chunk.text || '').toLowerCase();
      let startIdx = 0;
      while (true) {
        const pos = text.indexOf(q, startIdx);
        if (pos === -1) break;
        result.push({ chunkIndex: i, start: pos, end: pos + q.length });
        startIdx = pos + 1;
      }
    });
    return result;
  }, [query, transcript]);

  const goToMatch = (idx) => {
    if (matches.length === 0) return;
    const bounded = ((idx % matches.length) + matches.length) % matches.length;
    setCurrentMatch(bounded);
    if (onJumpTo) onJumpTo(matches[bounded].chunkIndex);
  };

  // Highlight a chunk of text with the search query
  const highlightText = (text, chunkIndex) => {
    if (!query.trim()) return text;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    const parts = [];
    let lastEnd = 0;

    let startIdx = 0;
    while (true) {
      const pos = t.indexOf(q, startIdx);
      if (pos === -1) break;
      if (pos > lastEnd) parts.push({ text: text.slice(lastEnd, pos), highlight: false });
      parts.push({ text: text.slice(pos, pos + q.length), highlight: true });
      lastEnd = pos + q.length;
      startIdx = pos + 1;
    }
    if (lastEnd < text.length) parts.push({ text: text.slice(lastEnd), highlight: false });

    if (parts.length === 0) return text;

    return parts.map((p, i) =>
      p.highlight ? (
        <mark key={i} className="search-highlight">{p.text}</mark>
      ) : (
        <span key={i}>{p.text}</span>
      )
    );
  };

  return {
    searchBar: (
      <div className="transcript-search">
        <div className="transcript-search-input-wrap">
          <span className="transcript-search-icon">🔍</span>
          <input
            className="input transcript-search-input"
            placeholder="Search transcript..."
            value={query}
            onChange={e => { setQuery(e.target.value); setCurrentMatch(0); }}
          />
          {query && (
            <span className="transcript-search-count">
              {matches.length > 0
                ? `${currentMatch + 1}/${matches.length}`
                : '0 results'}
            </span>
          )}
        </div>
        {query && matches.length > 0 && (
          <div className="transcript-search-nav">
            <button className="btn btn-ghost btn-sm" onClick={() => goToMatch(currentMatch - 1)}>▲</button>
            <button className="btn btn-ghost btn-sm" onClick={() => goToMatch(currentMatch + 1)}>▼</button>
          </div>
        )}
        {query && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setQuery(''); setCurrentMatch(0); }}>✕</button>
        )}
      </div>
    ),
    highlightText,
    matches,
    currentMatch,
    query,
  };
}
