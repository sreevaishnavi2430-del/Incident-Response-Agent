import React from 'react';
import { ChangeTypeBadge } from './ChangeTypeBadge';
import { SeverityBadge } from './SeverityBadge';
import { formatTimestamp, formatTimeDelta } from '../utils/formatters';
import {
  BellRing,
  Link2,
  EyeOff,
  Scale,
  Clock,
  Sparkles
} from 'lucide-react';

const VERDICT_STYLE = {
  correlated: {
    nodeBg: '#0f2942',
    nodeBorder: '3px solid #38bdf8',
    nodeGlow: '0 0 12px rgba(56, 189, 248, 0.4)',
    iconColor: '#38bdf8',
    cardBg: 'var(--bg-card)',
    cardBorder: '1.5px solid #38bdf8',
    cardLeft: '5px solid #38bdf8',
    opacity: 1
  },
  considered: {
    nodeBg: '#2a2210',
    nodeBorder: '2px solid #f59e0b',
    nodeGlow: 'none',
    iconColor: '#fcd34d',
    cardBg: 'rgba(30, 25, 10, 0.35)',
    cardBorder: '1px solid rgba(245, 158, 11, 0.35)',
    cardLeft: '2px solid rgba(245, 158, 11, 0.5)',
    opacity: 0.85
  },
  excluded: {
    nodeBg: '#1e293b',
    nodeBorder: '2px solid #475569',
    nodeGlow: 'none',
    iconColor: '#64748b',
    cardBg: 'rgba(21, 30, 50, 0.45)',
    cardBorder: '1px solid var(--border-subtle)',
    cardLeft: '2px solid #334155',
    opacity: 0.65
  }
};

function verdictIcon(verdict) {
  if (verdict === 'correlated') return <Link2 size={16} />;
  if (verdict === 'considered') return <Scale size={15} />;
  return <EyeOff size={15} />;
}

function verdictLabel(verdict) {
  if (verdict === 'correlated') return 'CORRELATED CHANGE';
  if (verdict === 'considered') return 'CONSIDERED · BELOW THRESHOLD';
  return 'UNCORRELATED (DECOY)';
}

export function IncidentTimeline({ incident, activeHighlightId }) {
  if (!incident) return null;

  const { alert, changes = [], correlation } = incident;
  const windowMinutes = correlation?.window_minutes ?? 60;

  // Chronological trail: oldest change first, alert rendered on top.
  const sortedChanges = [...changes].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-card)',
          paddingBottom: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em'
              }}
            >
              Correlated Incident Timeline
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                color: 'var(--text-code)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '2px 8px',
                borderRadius: '12px'
              }}
              title={correlation?.engine || 'deterministic-rule-engine'}
            >
              Rule-Based Match: {windowMinutes}m Window
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Deterministic cross-reference of recent system events against the incoming alert signal.
          </p>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--bg-card)',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: '#38bdf8',
                boxShadow: '0 0 8px rgba(56, 189, 248, 0.6)'
              }}
            />
            <span style={{ color: '#7dd3fc', fontWeight: 600 }}>Correlated</span>
          </div>
          <span style={{ color: 'var(--border-card)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#f59e0b' }} />
            <span style={{ color: '#fcd34d', fontWeight: 600 }}>Considered</span>
          </div>
          <span style={{ color: 'var(--border-card)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#475569' }} />
            <span style={{ color: 'var(--text-muted)' }}>Decoy</span>
          </div>
        </div>
      </div>

      {/* Vertical Timeline Container */}
      <div style={{ position: 'relative', paddingLeft: '8px' }}>
        <div
          style={{
            position: 'absolute',
            top: '32px',
            bottom: '24px',
            left: '26px',
            width: '2px',
            backgroundColor: 'var(--border-card)',
            zIndex: 1
          }}
        />

        {/* ==================== 1. TRIGGER ALERT NODE ==================== */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '18px',
            marginBottom: '28px',
            zIndex: 2
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              border: '4px solid var(--bg-surface)',
              boxShadow: '0 0 0 2px #ef4444, 0 0 16px rgba(239, 68, 68, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0
            }}
          >
            <BellRing size={18} />
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px solid var(--sev-high-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.12)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em'
                  }}
                >
                  INCIDENT TRIGGER
                </span>
                <SeverityBadge severity={alert?.severity} size="sm" />
                {alert?.source && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    via {alert.source}
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={13} />
                <span>{formatTimestamp(alert?.fired_at)}</span>
              </div>
            </div>

            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#fff',
                marginBottom: '4px',
                overflowWrap: 'anywhere'
              }}
            >
              {alert?.description}
            </div>

            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              Target Service: <span style={{ color: 'var(--text-code)' }}>{incident.service}</span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div
          style={{
            position: 'relative',
            marginLeft: '44px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>↓ PRECEDING SYSTEM CHANGES (DETECTED WITHIN {windowMinutes}-MIN CORRELATION WINDOW)</span>
          </div>
        </div>

        {/* ==================== 2. CHANGE LIST ==================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {sortedChanges.map((change) => {
            const verdict = change.engine_verdict || (change.correlated ? 'correlated' : 'excluded');
            const style = VERDICT_STYLE[verdict] || VERDICT_STYLE.excluded;
            const isHighlighted = activeHighlightId === String(change.id);
            const timeDelta = formatTimeDelta(change.changed_at, alert?.fired_at);
            const reasons = (change.correlation_reasons || []).join('; ');

            return (
              <div
                key={change.id}
                id={`change-${change.id}`}
                className={isHighlighted ? 'timeline-evidence-highlight' : ''}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '18px',
                  zIndex: 2,
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Node Marker */}
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: style.nodeBg,
                    border: style.nodeBorder,
                    boxShadow: style.nodeGlow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: style.iconColor,
                    flexShrink: 0
                  }}
                  title={
                    verdict === 'correlated'
                      ? 'Correlated by the deterministic engine'
                      : verdict === 'considered'
                        ? 'Inside the window but scored below the correlation threshold'
                        : 'Outside the correlation window'
                  }
                >
                  {verdictIcon(verdict)}
                </div>

                {/* Change Card */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    backgroundColor: style.cardBg,
                    border: style.cardBorder,
                    borderLeft: style.cardLeft,
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                    opacity: style.opacity,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (verdict !== 'correlated') e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = style.opacity;
                  }}
                >
                  {/* Top metadata line */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <ChangeTypeBadge type={change.change_type} />

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor:
                            verdict === 'correlated'
                              ? 'rgba(56, 189, 248, 0.15)'
                              : verdict === 'considered'
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'rgba(71, 85, 105, 0.2)',
                          color:
                            verdict === 'correlated'
                              ? '#38bdf8'
                              : verdict === 'considered'
                                ? '#fcd34d'
                                : 'var(--text-muted)',
                          border:
                            verdict === 'correlated'
                              ? '1px solid rgba(56, 189, 248, 0.35)'
                              : verdict === 'considered'
                                ? '1px solid rgba(245, 158, 11, 0.35)'
                                : '1px solid rgba(71, 85, 105, 0.3)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {verdict === 'correlated' && <Sparkles size={11} />}
                        {verdictLabel(verdict)}
                      </span>

                      {typeof change.correlation_score === 'number' && verdict !== 'excluded' && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 800,
                            color: verdict === 'correlated' ? '#7dd3fc' : '#fcd34d',
                            backgroundColor: verdict === 'correlated' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            border: `1px solid ${verdict === 'correlated' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            padding: '1px 7px',
                            borderRadius: '4px'
                          }}
                          title={reasons || 'Correlation score components'}
                        >
                          {change.correlation_score}/100
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        ID: #{change.id}
                      </span>
                    </div>

                    {/* Time delta + timestamp */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {timeDelta && (
                        <span
                          style={{
                            color: verdict === 'correlated' ? '#fcd34d' : 'var(--text-muted)',
                            fontWeight: verdict === 'correlated' ? 700 : 500,
                            backgroundColor: verdict === 'correlated' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                            padding: verdict === 'correlated' ? '1px 6px' : '0',
                            borderRadius: '3px'
                          }}
                        >
                          {timeDelta}
                        </span>
                      )}
                      <span style={{ color: 'var(--text-muted)' }}>
                        {formatTimestamp(change.changed_at)}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div
                    style={{
                      fontSize: '14px',
                      color: verdict === 'excluded' ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontWeight: verdict === 'correlated' ? 600 : 400,
                      lineHeight: 1.45,
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {change.description}
                  </div>

                  {/* Engine reasons (evidence trail) */}
                  {verdict === 'correlated' && reasons && (
                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px dashed rgba(56, 189, 248, 0.25)',
                        fontSize: '11.5px',
                        fontFamily: 'var(--font-mono)',
                        color: '#7dd3fc',
                        lineHeight: 1.5
                      }}
                    >
                      Engine: {reasons}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
