import React from 'react';

export function StatusBadge({ status }) {
  const normalized = status?.toLowerCase() || 'open';

  let bg = 'rgba(239, 68, 68, 0.12)';
  let border = 'rgba(239, 68, 68, 0.4)';
  let color = '#fca5a5';
  let dotColor = '#ef4444';
  let label = 'OPEN';
  let isPulse = true;

  if (normalized === 'diagnosed') {
    bg = 'rgba(56, 189, 248, 0.12)';
    border = 'rgba(56, 189, 248, 0.4)';
    color = '#7dd3fc';
    dotColor = '#38bdf8';
    label = 'DIAGNOSED';
    isPulse = false;
  } else if (normalized === 'resolved') {
    bg = 'rgba(52, 211, 153, 0.12)';
    border = 'rgba(52, 211, 153, 0.4)';
    color = '#6ee7b7';
    dotColor = '#10b981';
    label = 'RESOLVED';
    isPulse = false;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 9px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        borderRadius: '4px',
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}
    >
      <span
        className={isPulse ? 'radar-dot' : ''}
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block'
        }}
      />
      {label}
    </span>
  );
}
