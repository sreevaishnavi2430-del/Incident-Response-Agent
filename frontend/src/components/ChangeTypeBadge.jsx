import React from 'react';
import { Rocket, Sliders, GitCommit, Flag } from 'lucide-react';
import { getChangeTypeConfig } from '../utils/formatters';

export function ChangeTypeBadge({ type }) {
  const config = getChangeTypeConfig(type);

  const renderIcon = () => {
    const size = 12;
    switch (type?.toLowerCase()) {
      case 'deploy':
        return <Rocket size={size} />;
      case 'config':
        return <Sliders size={size} />;
      case 'feature_flag':
      case 'flag':
        return <Flag size={size} />;
      case 'commit':
      default:
        return <GitCommit size={size} />;
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        backgroundColor: config.bgColor,
        color: config.textColor,
        border: `1px solid ${config.borderColor}`,
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
      }}
    >
      {renderIcon()}
      {config.label}
    </span>
  );
}
