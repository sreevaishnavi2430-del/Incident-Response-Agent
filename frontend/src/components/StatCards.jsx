import React from 'react';
import { AlertTriangle, Zap, Gauge, CheckCircle2 } from 'lucide-react';

function StatCard({ icon, color, label, value, sub, loading }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '8px',
          flexShrink: 0,
          backgroundColor: color.bg,
          border: `1px solid ${color.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color.accent
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: color.accent, fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
          {loading ? '—' : value}
        </div>
        {sub && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

export function StatCards({ stats, loading, windowMinutes = 60 }) {
  if (!stats && loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-pulse" style={{ height: '76px', borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    );
  }

  const red = { bg: 'rgba(239, 68, 68, 0.14)', border: 'rgba(239, 68, 68, 0.3)', accent: '#fca5a5' };
  const blue = { bg: 'rgba(56, 189, 248, 0.14)', border: 'rgba(56, 189, 248, 0.3)', accent: '#7dd3fc' };
  const amber = { bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.3)', accent: '#fcd34d' };
  const green = { bg: 'rgba(16, 185, 129, 0.14)', border: 'rgba(16, 185, 129, 0.3)', accent: '#34d399' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
      <StatCard
        icon={<AlertTriangle size={22} />}
        color={red}
        label="High Severity Open"
        value={stats ? stats.high_severity : '—'}
        sub={`${stats?.open ?? 0} incidents open`}
        loading={loading}
      />
      <StatCard
        icon={<Zap size={22} />}
        color={blue}
        label="Correlation Rate"
        value={stats ? `${Math.round(stats.correlation_rate * 100)}%` : '—'}
        sub={`${stats?.incidents_with_correlated_changes ?? 0} of ${stats?.total_incidents ?? 0} incidents had a nearby change`}
        loading={loading}
      />
      <StatCard
        icon={<Gauge size={22} />}
        color={amber}
        label="Avg Top Score"
        value={stats ? `${stats.avg_top_score}/100` : '—'}
        sub={`rule-based, window ${windowMinutes}m`}
        loading={loading}
      />
      <StatCard
        icon={<CheckCircle2 size={22} />}
        color={green}
        label="Resolved"
        value={stats ? `${stats.resolved}/${stats.total_incidents}` : '—'}
        sub={`${stats?.diagnosed ?? 0} diagnosed, awaiting fix`}
        loading={loading}
      />
    </div>
  );
}
