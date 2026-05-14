import { useState, useRef, useCallback } from 'react';

const WS_URL = "ws://localhost:8000/ws/transcribe";
const CHUNK_INTERVAL = 4000; // 4 seconds per recording chunk

export function useTranscription() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState([]);
    const [summary, setSummary] = useState("");
    const [status, setStatus] = useState("idle");

    const wsRef = useRef(null);
    const streamRef = useRef(null);
    const recorderRef = useRef(null);
    const isStoppingRef = useRef(false);


    /**
     * Records a single chunk by creating a fresh MediaRecorder.
     * Each call produces a complete, valid webm file with proper EBML headers.
     * This avoids the issue where MediaRecorder.start(timeslice) produces
     * headerless continuation chunks after the first one.
     */
    const recordOneChunk = useCallback((stream) => {
        return new Promise((resolve) => {
            const recorder = new MediaRecorder(stream, {
                mimeType: "audio/webm;codecs=opus",
            });
            recorderRef.current = recorder;
            const chunks = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
                if (blob.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
                    console.log(`Sending webm chunk: ${blob.size} bytes`);
                    wsRef.current.send(blob);
                }
                resolve();
            };

            recorder.start();

            // Stop after CHUNK_INTERVAL to produce a complete webm file
            setTimeout(() => {
                if (recorder.state === "recording") recorder.stop();
            }, CHUNK_INTERVAL);
        });
    }, []);


    const startRecording = useCallback(async () => {
        try {
            // Reset state
            setTranscript([]);
            setSummary("");
            setStatus("recording");
            isStoppingRef.current = false;

            // Connect WebSocket
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            await new Promise((resolve, reject) => {
                ws.onopen = () => { console.log("WebSocket connected"); resolve(); };
                ws.onerror = (err) => { console.error("WS connect failed:", err); reject(err); };
            });

            // Set up message handlers (after connection is established)
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log("Server:", data.type);

                if (data.type === "transcript") {
                    setTranscript((prev) => [...prev, data.text]);
                } else if (data.type === "status") {
                    setStatus("processing");
                } else if (data.type === "summary") {
                    setSummary(data.text);
                    setStatus("done");
                }
            };

            ws.onerror = (err) => console.error("WS error:", err);
            ws.onclose = (e) => console.log("WS closed:", e.code, e.reason);

            // Get microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Start chunk loop — each iteration creates a new MediaRecorder
            const recordLoop = async () => {
                while (!isStoppingRef.current) {
                    await recordOneChunk(stream);
                }
            };
            recordLoop();

            setIsRecording(true);
        } catch (error) {
            console.error("Failed to start recording:", error);
            setStatus("error");
        }
    }, [recordOneChunk]);


    const stopRecording = useCallback(() => {
        console.log("Stopping recording...");
        isStoppingRef.current = true;

        // Stop current recorder — the onstop handler sends the final chunk
        if (recorderRef.current && recorderRef.current.state === "recording") {
            const originalOnStop = recorderRef.current.onstop;
            recorderRef.current.onstop = (e) => {
                if (originalOnStop) originalOnStop(e);
                // Small delay to ensure final chunk arrives before STOP command
                setTimeout(() => {
                    console.log("Sending STOP command");
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send("STOP");
                    }
                }, 300);
            };
            recorderRef.current.stop();
        } else {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send("STOP");
            }
        }

        // Release microphone
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
        }

        setIsRecording(false);
    }, []);


    return {
        isRecording,
        transcript,
        summary, 
        status, 
        startRecording,
        stopRecording,
    };
}