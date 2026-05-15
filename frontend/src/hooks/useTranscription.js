import { useState, useRef, useCallback, useEffect } from 'react';

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/transcribe";

export function useTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState("idle"); // idle | recording | paused | processing | done | error
  const [sessionName, setSessionName] = useState("");
  const [summaryFormat, setSummaryFormat] = useState("meeting_notes");
  const [audioUrl, setAudioUrl] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [streamingText, setStreamingText] = useState("");

  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const isStoppingRef = useRef(false);
  const isPausedRef = useRef(false);
  const timerRef = useRef(null);
  const audioBlobsRef = useRef([]);
  const chunkIntervalRef = useRef(4000);
  const reconnectRef = useRef(0);

  // Load settings
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('transcription-settings') || '{}');
      if (s.chunkInterval) chunkIntervalRef.current = s.chunkInterval;
    } catch {}
  }, []);

  // Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  const connectWebSocket = useCallback(() => {
    return new Promise((resolve, reject) => {
      const settings = JSON.parse(localStorage.getItem('transcription-settings') || '{}');
      const lang = settings.language || '';
      const model = settings.whisperModel || 'base';
      const url = `${DEFAULT_WS_URL}?language=${lang}&model=${model}&format=${summaryFormat}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        reconnectRef.current = 0;
        resolve();
      };

      ws.onerror = (err) => {
        console.error("WS connect failed:", err);
        reject(err);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Server:", data.type);

        if (data.type === "transcript") {
          setTranscript(prev => [...prev, data.text]);
        } else if (data.type === "status") {
          setStatus("processing");
        } else if (data.type === "summary_chunk") {
          setStreamingText(prev => prev + data.text);
        } else if (data.type === "summary") {
          setSummary(data.text);
          setStreamingText("");
          setStatus("done");
        } else if (data.type === "error") {
          console.error("Server error:", data.message);
          setStatus("error");
        } else if (data.type === "session_saved") {
          console.log("Session saved:", data.session_id);
        }
      };

      ws.onclose = (e) => {
        console.log("WS closed:", e.code, e.reason);
        // Auto-reconnect during recording (max 3 attempts)
        if (isRecording && !isStoppingRef.current && reconnectRef.current < 3) {
          reconnectRef.current++;
          console.log(`Reconnecting (attempt ${reconnectRef.current})...`);
          setTimeout(() => {
            connectWebSocket().catch(console.error);
          }, 1000 * reconnectRef.current);
        }
      };
    });
  }, [summaryFormat]);

  const recordOneChunk = useCallback((stream) => {
    return new Promise((resolve) => {
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      recorderRef.current = recorder;
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          audioBlobsRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
        if (blob.size > 0 && wsRef.current?.readyState === WebSocket.OPEN && !isPausedRef.current) {
          console.log(`Sending webm chunk: ${blob.size} bytes`);
          wsRef.current.send(blob);
        }
        resolve();
      };

      recorder.start();

      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, chunkIntervalRef.current);
    });
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setTranscript([]);
      setSummary("");
      setStreamingText("");
      setStatus("recording");
      setElapsedTime(0);
      setAudioUrl(null);
      isStoppingRef.current = false;
      isPausedRef.current = false;
      setIsPaused(false);
      audioBlobsRef.current = [];

      await connectWebSocket();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recordLoop = async () => {
        while (!isStoppingRef.current) {
          if (!isPausedRef.current) {
            await recordOneChunk(stream);
          } else {
            await new Promise(r => setTimeout(r, 200));
          }
        }
      };
      recordLoop();

      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setStatus("error");
    }
  }, [connectWebSocket, recordOneChunk]);

  const pauseRecording = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    setStatus("paused");
  }, []);

  const resumeRecording = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    setStatus("recording");
  }, []);

  const stopRecording = useCallback(() => {
    console.log("Stopping recording...");
    isStoppingRef.current = true;
    isPausedRef.current = false;

    // Build full audio blob for playback
    if (audioBlobsRef.current.length > 0) {
      const fullBlob = new Blob(audioBlobsRef.current, { type: "audio/webm;codecs=opus" });
      setAudioUrl(URL.createObjectURL(fullBlob));
    }

    if (recorderRef.current && recorderRef.current.state === "recording") {
      const originalOnStop = recorderRef.current.onstop;
      recorderRef.current.onstop = (e) => {
        if (originalOnStop) originalOnStop(e);
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const payload = JSON.stringify({
              command: "STOP",
              session_name: sessionName || `Session ${new Date().toLocaleString()}`,
              format: summaryFormat,
            });
            wsRef.current.send(payload);
          }
        }, 300);
      };
      recorderRef.current.stop();
    } else {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify({
          command: "STOP",
          session_name: sessionName || `Session ${new Date().toLocaleString()}`,
          format: summaryFormat,
        });
        wsRef.current.send(payload);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    setIsRecording(false);
    setIsPaused(false);
  }, [sessionName, summaryFormat]);

  const updateTranscriptChunk = useCallback((index, newText) => {
    setTranscript(prev => {
      const copy = [...prev];
      copy[index] = newText;
      return copy;
    });
  }, []);

  const resummarize = useCallback(async (format) => {
    if (!transcript || transcript.length === 0) return;
    setSummary("");
    setStreamingText("");
    setStatus("processing");

    try {
      const res = await fetch("http://localhost:8000/api/resummarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.join(" "),
          format: format || summaryFormat,
        }),
      });
      const data = await res.json();
      setSummary(data.summary);
      setStatus("done");
    } catch (err) {
      console.error("Re-summarize error:", err);
      setStatus("error");
    }
  }, [transcript, summaryFormat]);

  return {
    isRecording,
    isPaused,
    transcript,
    summary,
    status,
    sessionName,
    setSessionName,
    summaryFormat,
    setSummaryFormat,
    audioUrl,
    elapsedTime,
    streamingText,
    stream: streamRef.current,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    updateTranscriptChunk,
    resummarize,
  };
}