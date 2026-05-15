import { useEffect } from 'react';

export function useKeyboardShortcuts({ isRecording, startRecording, stopRecording, status }) {
  useEffect(() => {
    const handler = (e) => {
      // Don't trigger if user is typing in an input/textarea
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      // Space: toggle recording
      if (e.code === 'Space' && status !== 'processing') {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      }

      // Escape: stop recording
      if (e.code === 'Escape' && isRecording) {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isRecording, startRecording, stopRecording, status]);
}
