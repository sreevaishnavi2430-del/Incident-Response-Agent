/**
 * Formats ISO 8601 string into a precise monospace UTC timestamp
 * e.g., "2026-09-20 14:32:00 UTC"
 */
export function formatTimestamp(isoString) {
  if (!isoString) return '--:--:--';
  try {
    const d = new Date(isoString);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  } catch {
    return isoString;
  }
}

/**
 * Calculates human-readable delta between change and alert time
 * e.g., "4m before alert", "42m before alert", "just now"
 */
export function formatTimeDelta(targetIso, referenceIso) {
  if (!targetIso || !referenceIso) return '';
  try {
    const target = new Date(targetIso).getTime();
    const reference = new Date(referenceIso).getTime();
    const diffMs = reference - target;

    if (diffMs < 0) {
      // Occurred after alert
      const secs = Math.round(Math.abs(diffMs) / 1000);
      return secs < 60 ? `${secs}s after` : `${Math.round(secs / 60)}m after`;
    }

    const diffSecs = Math.round(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s before alert`;
    const diffMins = Math.round(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m before alert`;
    const diffHours = (diffMins / 60).toFixed(1);
    return `${diffHours}h before alert`;
  } catch {
    return '';
  }
}

/**
 * Returns clean severity metadata
 */
export function getSeverityConfig(severity) {
  switch (severity?.toLowerCase()) {
    case 'high':
    case 'critical':
      return {
        label: 'CRITICAL',
        color: 'var(--sev-high-text)',
        bg: 'var(--sev-high-bg)',
        border: 'var(--sev-high-border)',
        badgeBg: 'var(--sev-high-badge)',
        dotColor: '#ef4444'
      };
    case 'medium':
      return {
        label: 'MEDIUM',
        color: 'var(--sev-med-text)',
        bg: 'var(--sev-med-bg)',
        border: 'var(--sev-med-border)',
        badgeBg: 'var(--sev-med-badge)',
        dotColor: '#f59e0b'
      };
    case 'low':
    default:
      return {
        label: 'LOW',
        color: 'var(--sev-low-text)',
        bg: 'var(--sev-low-bg)',
        border: 'var(--sev-low-border)',
        badgeBg: 'var(--sev-low-badge)',
        dotColor: '#94a3b8'
      };
  }
}

/**
 * Returns change type configuration (tag label, colors)
 */
export function getChangeTypeConfig(type) {
  switch (type?.toLowerCase()) {
    case 'deploy':
      return {
        label: 'DEPLOY',
        textColor: '#c084fc',
        bgColor: 'rgba(168, 85, 247, 0.14)',
        borderColor: '#a855f7'
      };
    case 'config':
      return {
        label: 'CONFIG',
        textColor: '#fbbf24',
        bgColor: 'rgba(245, 158, 11, 0.14)',
        borderColor: '#f59e0b'
      };
    case 'feature_flag':
    case 'flag':
      return {
        label: 'FLAG',
        textColor: '#34d399',
        bgColor: 'rgba(16, 185, 129, 0.14)',
        borderColor: '#10b981'
      };
    case 'commit':
    default:
      return {
        label: 'COMMIT',
        textColor: '#60a5fa',
        bgColor: 'rgba(59, 130, 246, 0.14)',
        borderColor: '#3b82f6'
      };
  }
}
