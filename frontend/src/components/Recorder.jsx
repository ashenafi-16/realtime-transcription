import React from 'react';

const STATUS_MESSAGES = {
    idle: "Click the button to start recording.",
    recording: "Recording... speak clearly into your microphone.",
    processing: "generating summary, please wait...",
    done: "Done! Your summary is ready below",
};

const STATUS_COLORS = {
  idle: "#9ca3af",       // gray
  recording: "#ef4444",  // red
  processing: "#f59e0b", // amber
  done: "#22c55e",       // green
};

export default function Recorder({
    isRecording,
    status, 
    startRecording,
    stopRecording,
}) {
    return (
        <div style={styles.wrapper}>
            <h1 style={styles.title}>🎙️ Real-Time Transcription</h1>
            <p style={styles.subtitle}>
                Record your meeting and get an AI-powered summary
            </p>

            <button 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={status === "processing"}
                style={{
                    ...styles.button,
                    backgroundColor: isRecording ? "#ef4444" : "#6366f1",
                    opacity: status === "processing" ? 0.6 : 1,
                    cursor: status === "processing" ? "not-allowed" : "pointer",
                }}
            >
                {isRecording && <span style={styles.pulseDot} />}

                {status === "processing" 
                    ? "Processing..."
                    : isRecording
                    ? "⏹ Stop Recording"
                    : "⏺ Start Recording"
                }
            </button>

            <div style={styles.statusRow}> 
                <span 
                    style={{
                        ...styles.statusDot,
                        backgroundColor: STATUS_COLORS[status] || "#9ca3af",
                        // Animate the dot when recording
                        animation: status === "recording" ? "pulse 1.5s infinite" : "none",
                    }}
                />
                <span style={styles.statusText}>
                    {STATUS_MESSAGES[status] || "Unknown status"}
                </span>
            </div>

            {/* pulse animation keyframes */}
            <style>{`
            @keyframes pulse {
            0%   { opacity: 1; transform: scale(1); }
            50%  { opacity: 0.4; transform: scale(1.4);}
            100% { opacity: 1; transform: scale(1); }
            }
            `}</style>
        </div>
    );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem",
    gap: "1rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    margin: 0,
    color: "#1e1b4b",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#6b7280",
    margin: 0,
  },
  button: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.9rem 2.5rem",
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#ffffff",
    border: "none",
    borderRadius: "999px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
  },
  pulseDot: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    animation: "pulse 1.5s infinite",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    display: "inline-block",
  },
  statusText: {
    fontSize: "0.9rem",
    color: "#6b7280",
  },
};