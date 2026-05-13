import React, { useEffect, useRef } from "react";

export default function Transcript({ transcript, isRecording }) {
  // Ref to the bottom of the transcript list — for auto-scrolling
  const bottomRef = useRef(null);

  // Every time a new chunk arrives, scroll to the bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div style={styles.wrapper}>

      {/* Header row */}
      <div style={styles.header}>
        <h2 style={styles.title}>📝 Live Transcript</h2>

        {/* Chunk counter badge */}
        {transcript.length > 0 && (
          <span style={styles.badge}>
            {transcript.length} chunk{transcript.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Transcript box */}
      <div style={styles.box}>

        {/* Empty state */}
        {transcript.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🎤</span>
            <p style={styles.emptyText}>
              {isRecording
                ? "Listening... start speaking"
                : "Your transcript will appear here once you start recording"}
            </p>
          </div>
        ) : (

          // Transcript chunks
          <div style={styles.chunkList}>
            {transcript.map((chunk, index) => (
              <div key={index} style={styles.chunk}>

                {/* Chunk number label */}
                <span style={styles.chunkIndex}>
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Chunk text */}
                <p style={styles.chunkText}>{chunk}</p>
              </div>
            ))}

            {/* Live recording indicator — shown at the bottom while recording */}
            {isRecording && (
              <div style={styles.liveRow}>
                <span style={styles.liveDot} />
                <span style={styles.liveText}>Listening...</span>
              </div>
            )}

            {/* Invisible div at the bottom — scroll target */}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%   { opacity: 1; transform: scale(1); }
          50%  { opacity: 0.3; transform: scale(1.5); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

    </div>
  );
}

// --- Styles ---
const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    width: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: "700",
    margin: 0,
    color: "#1e1b4b",
  },
  badge: {
    backgroundColor: "#e0e7ff",
    color: "#4338ca",
    fontSize: "0.8rem",
    fontWeight: "600",
    padding: "0.2rem 0.7rem",
    borderRadius: "999px",
  },
  box: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1.25rem",
    minHeight: "200px",
    maxHeight: "350px",
    overflowY: "auto",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "160px",
    gap: "0.75rem",
  },
  emptyIcon: {
    fontSize: "2.5rem",
  },
  emptyText: {
    fontSize: "0.95rem",
    color: "#9ca3af",
    textAlign: "center",
    margin: 0,
  },
  chunkList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  chunk: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "0.6rem 0.75rem",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  chunkIndex: {
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#a5b4fc",
    minWidth: "20px",
    marginTop: "2px",
  },
  chunkText: {
    fontSize: "0.95rem",
    color: "#374151",
    margin: 0,
    lineHeight: "1.6",
  },
  liveRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.4rem 0.75rem",
  },
  liveDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#ef4444",
    animation: "pulse 1.5s infinite",
    display: "inline-block",
  },
  liveText: {
    fontSize: "0.85rem",
    color: "#9ca3af",
    fontStyle: "italic",
  },
};