import React from 'react';
import { useToast } from '../context/ToastContext';

export default function ExportButtons({ transcript, summary }) {
  const toast = useToast();

  const getTranscriptText = () => {
    if (!transcript || transcript.length === 0) return '';
    return transcript.join('\n\n');
  };

  const copyTranscript = async () => {
    const text = getTranscriptText();
    if (!text) { toast.error('No transcript to copy'); return; }
    await navigator.clipboard.writeText(text);
    toast.success('Transcript copied to clipboard');
  };

  const copySummary = async () => {
    if (!summary) { toast.error('No summary to copy'); return; }
    await navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard');
  };

  const downloadTxt = () => {
    const text = getTranscriptText();
    if (!text && !summary) { toast.error('Nothing to download'); return; }

    let content = '';
    if (text) {
      content += '=== TRANSCRIPT ===\n\n' + text + '\n\n';
    }
    if (summary) {
      content += '=== SUMMARY ===\n\n' + summary;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as TXT');
  };

  const hasContent = (transcript && transcript.length > 0) || summary;

  if (!hasContent) return null;

  return (
    <div className="export-group">
      <button className="btn btn-ghost btn-sm" onClick={copyTranscript} title="Copy transcript">
        📋 Copy Transcript
      </button>
      <button className="btn btn-ghost btn-sm" onClick={copySummary} title="Copy summary">
        📄 Copy Summary
      </button>
      <button className="btn btn-ghost btn-sm" onClick={downloadTxt} title="Download as TXT">
        ⬇️ Download TXT
      </button>
    </div>
  );
}
