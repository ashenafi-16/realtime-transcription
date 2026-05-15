import React, { useRef, useState, useEffect } from 'react';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function AudioPlayer({ audioUrl }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const onSeek = (e) => {
    const val = parseFloat(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const onVolume = (e) => {
    const val = parseFloat(e.target.value);
    audioRef.current.volume = val;
    setVolume(val);
  };

  if (!audioUrl) return null;

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button className="audio-player-btn" onClick={togglePlay}>
        {playing ? '⏸' : '▶'}
      </button>
      <span className="audio-player-time">{formatTime(currentTime)}</span>
      <input
        type="range"
        className="audio-player-seek"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={onSeek}
      />
      <span className="audio-player-time">{formatTime(duration)}</span>
      <span style={{ fontSize: '0.85rem' }}>🔊</span>
      <input
        type="range"
        className="audio-player-volume"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={onVolume}
      />
    </div>
  );
}
