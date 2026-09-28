import React from 'react';
import { getSeverityConfig } from '../utils/formatters';

export function SeverityBadge({ severity, size = 'md' }) {
  const config = getSeverityConfig(severity);

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isSmall ? '2px 7px' : '3px 10px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
        borderRadius: '9999px',
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        textTransform: 'uppercase',
        lineHeight: 1.2
      }}
      title={`Severity: ${config.label}`}
    >
      <span
        style={{
          width: isSmall ? '5px' : '7px',
          height: isSmall ? '5px' : '7px',
          borderRadius: '50%',
          backgroundColor: config.dotColor
        }}
      />
      {config.label}
    </span>
  );
}
