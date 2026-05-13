import { useState, useRef, useCallback } from 'react';

const WS_URL = "ws://localhost:8000/ws/transcribe";

export function useTranscription() {
    // what the UI displays 
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState([]);
    const [summary, setSummary] = useState("");
    const [status, setStatus] = useState("idle");

    // internal values that don't trigger re-renders

    const wsRef = useRef(null);      // WebSocket connection
    const mediaRecorderRef = useRef(null);    // MediaRecorder instance 
    const streamRef = useRef(null);     // Microphone stream


    const startRecording = useCallback(async () => {
        try {
            // 1. Reset previous session data
            setTranscript([]);
            setSummary("");
            setStatus("recording");

            // 2. Open WebSocket connection to FastAPI
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;


            // 3. Handle messages coming back from the server
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === "transcript") {
                    setTranscript((prev) => [...prev, data.text]);
                } else if (data.type === "status") {
                    setStatus("processing");
                } else if (data.type === "summary") {
                    setSummary(data.text);
                    setStatus("done");
                }

            };
            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                setStatus("idle");
            };

            // 4. Wait for WebSocket to open before starting audio
            await new Promise((resolve, reject) => {
                ws.onopen = resolve;
                ws.onerror = reject;
            });

            // 5. Request microphone access from the browser
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            streamRef.current = stream;

            // 6. Set up MediaRecorder to capture audio
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm",
            });
            mediaRecorderRef.current = mediaRecorder;

            // 7. Every time a chunk is ready, send it over WebSocket
            mediaRecorder.ondataavailable = (event) => {
                if (
                    event.data.size > 0 && 
                    wsRef.current?.readyState === WebSocket.OPEN
                ) {
                    wsRef.current.send(event.data);
                }
            };

            // 8. Start recording- collect a chunk every 2 seconds
            mediaRecorder.start(2000);
            setIsRecording(true);
        } catch (error) {
            console.error("Failed to start recording:", error);
            setStatus("idle");
        }
    }, []);

    const stopRecording = useCallback(() => {
        // 1. Stop the MediaRecorder (triggers final ondataavailable)
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }

        // 2. Stop all microphone tracks (release the mic)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
        }

        // 3. Send STOP command to server to trigger summarization
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send("STOP")
        }
        setIsRecording(false);
    }, []);

    // Return everything the UI components need
    return {
        isRecording,
        transcript,
        summary, 
        status, 
        startRecording,
        stopRecording,
    };

}