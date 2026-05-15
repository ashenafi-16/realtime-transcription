import React from 'react';

const STEPS = [
  { key: 'idle', label: 'Ready' },
  { key: 'recording', label: 'Recording' },
  { key: 'processing', label: 'Summarizing' },
  { key: 'done', label: 'Done' },
];

export default function ProgressSteps({ status }) {
  const currentIdx = STEPS.findIndex(s => s.key === status);

  return (
    <div className="progress-steps">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.key}>
          <div className={`progress-step ${i === currentIdx ? 'active' : ''} ${i < currentIdx ? 'completed' : ''}`}>
            <span className="progress-step-dot" />
            <span>{step.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`progress-connector ${i < currentIdx ? 'completed' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
