import React, { useState, useRef } from 'react';
import { useToast } from '../context/ToastContext';

const API = 'http://localhost:8000/api';

const ACCEPTED_TYPES = [
  'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac',
  'audio/mp4', 'audio/x-m4a', 'audio/aac',
  'video/mp4', 'video/webm', 'video/mpeg', 'video/quicktime',
];

export default function FileUpload({ language, onTranscriptResult }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const toast = useToast();

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSet(dropped);
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) validateAndSet(selected);
  };

  const validateAndSet = (f) => {
    if (f.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum 50MB.');
      return;
    }
    if (!ACCEPTED_TYPES.some(t => f.type.startsWith(t.split('/')[0]))) {
      toast.error('Please select an audio or video file.');
      return;
    }
    setFile(f);
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress stages
      setProgress(25);
      const progressTimer = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 85));
      }, 2000);

      const url = language
        ? `${API}/transcribe-file?language=${language}`
        : `${API}/transcribe-file`;

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressTimer);
      setProgress(95);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload failed');
      }

      const data = await res.json();
      setProgress(100);

      if (data.transcript) {
        toast.success('File transcribed successfully!');
        onTranscriptResult(data.transcript);
      } else {
        toast.info('No speech detected in the file.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to transcribe file');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {/* Drop Zone */}
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {!file ? (
          <>
            <div className="upload-zone-icon">📁</div>
            <p className="upload-zone-title">
              Drop your audio/video file here
            </p>
            <p className="upload-zone-sub">
              or <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>browse files</span>
            </p>
            <p className="upload-zone-hint">
              Supports MP3, WAV, WebM, M4A, FLAC, MP4, MOV — max 50MB
            </p>
          </>
        ) : (
          <div className="upload-file-info">
            <div className="upload-file-icon">
              {file.type.startsWith('video') ? '🎬' : '🎵'}
            </div>
            <div className="upload-file-details">
              <span className="upload-file-name">{file.name}</span>
              <span className="upload-file-size">{formatBytes(file.size)}</span>
            </div>
            {!uploading && (
              <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="upload-progress">
          <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
          <span className="upload-progress-text">
            {progress < 30 ? 'Uploading...' : progress < 90 ? 'Transcribing with Whisper...' : 'Finishing up...'}
          </span>
        </div>
      )}

      {/* Upload Button */}
      {file && !uploading && (
        <button
          className="btn btn-primary"
          onClick={uploadFile}
          style={{ marginTop: '1rem', width: '100%' }}
        >
          🚀 Transcribe File
        </button>
      )}
    </div>
  );
}
