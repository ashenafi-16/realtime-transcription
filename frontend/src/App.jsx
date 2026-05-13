import React from "react";
import { useTranscription } from "./hooks/useTranscription";
import Recorder from "./components/Recorder";
import Transcript from "./components/Transcript";
import Summary from "./components/Summary";

export default function App() {
  const {
    isRecording, 
    transcript,
    summary,
    status,
    startRecording,
    stopRecording,  
  } = useTranscription();

  return (
    <div style={styles.page}> 
      <div style={styles.topCard}>
        <Recorder 
          isRecording={isRecording}
          status={status}
          startRecording={startRecording}
          stopRecording={stopRecording}
        />
      </div>

      <div style={styles.bottomGrid}> 
        <Transcript
          transcript={transcript}
          isRecording={isRecording}
        />
        <Summary 
          summary={summary}
          status={status}
        />
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f1f5f9",
    padding: "2rem",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  topCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    padding: "1rem",
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
    alignItems: "start",
  },
};