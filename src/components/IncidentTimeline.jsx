import React from 'react';
import { ChangeTypeBadge } from './ChangeTypeBadge';
import { SeverityBadge } from './SeverityBadge';
import { formatTimestamp, formatTimeDelta } from '../utils/formatters';
import { 
  BellRing, 
  GitBranch, 
  Link2, 
  EyeOff, 
  CheckCircle, 
  Info,
  Clock,
  Sparkles
} from 'lucide-react';

export function IncidentTimeline({ incident, activeHighlightId }) {
  if (!incident) return null;

  const { alert, changes = [] } = incident;

  // Sort changes so the ones closest in time to the alert are clearly ordered
  // Sort descending by changed_at: closest to alert first
  const sortedChanges = [...changes].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 700,
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
            >
              Rule-Based Match: 60m Window
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
            gap: '12px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--bg-card)',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
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
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: '#475569'
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>Decoy (Uncorrelated)</span>
          </div>
        </div>
      </div>

      {/* Vertical Timeline Container */}
      <div style={{ position: 'relative', paddingLeft: '8px' }}>
        {/* Continuous vertical timeline connector line */}
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
          {/* Node Icon */}
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

          {/* Alert Content Card */}
          <div
            style={{
              flex: 1,
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
                marginBottom: '4px'
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

        {/* Separator / Progression Indicator */}
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
            <span>↓ PRECEDING SYSTEM CHANGES (DETECTED WITHIN 60-MIN CORRELATION WINDOW)</span>
          </div>
        </div>

        {/* ==================== 2. RECENT CHANGES LIST ==================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {sortedChanges.map((change, index) => {
            const isCorrelated = Boolean(change.correlated);
            const isHighlighted = activeHighlightId === String(change.id);
            const timeDelta = formatTimeDelta(change.changed_at, alert?.fired_at);

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
                {/* Node Marker on vertical line */}
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: isCorrelated ? '#0f2942' : '#1e293b',
                    border: isCorrelated
                      ? '3px solid #38bdf8'
                      : '2px solid #475569',
                    boxShadow: isCorrelated
                      ? '0 0 12px rgba(56, 189, 248, 0.4)'
                      : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isCorrelated ? '#38bdf8' : '#64748b',
                    flexShrink: 0
                  }}
                  title={isCorrelated ? 'Correlated by engine' : 'Uncorrelated decoy change'}
                >
                  {isCorrelated ? <Link2 size={16} /> : <EyeOff size={15} />}
                </div>

                {/* Change Card Body */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: isCorrelated ? 'var(--bg-card)' : 'rgba(21, 30, 50, 0.45)',
                    border: isCorrelated
                      ? '1.5px solid #38bdf8'
                      : '1px solid var(--border-subtle)',
                    borderLeft: isCorrelated
                      ? '5px solid #38bdf8'
                      : '2px solid #334155',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                    opacity: isCorrelated ? 1 : 0.65,
                    boxShadow: isCorrelated
                      ? '0 4px 16px rgba(56, 189, 248, 0.08)'
                      : 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCorrelated) e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isCorrelated) e.currentTarget.style.opacity = '0.65';
                  }}
                >
                  {/* Top line: Change Type, Correlated Badge, Time Delta, Timestamp */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ChangeTypeBadge type={change.change_type} />

                      {isCorrelated ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.04em'
                          }}
                        >
                          <Sparkles size={11} />
                          CORRELATED CHANGE
                        </span>
                      ) : (
                        <span
                          style={{
                            backgroundColor: 'rgba(71, 85, 105, 0.2)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(71, 85, 105, 0.3)',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          UNCORRELATED (DECOY)
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

                    {/* Time delta and absolute timestamp */}
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
                            color: isCorrelated ? '#fcd34d' : 'var(--text-muted)',
                            fontWeight: isCorrelated ? 700 : 500,
                            backgroundColor: isCorrelated ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                            padding: isCorrelated ? '1px 6px' : '0',
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

                  {/* Change Description */}
                  <div
                    style={{
                      fontSize: '14px',
                      color: isCorrelated ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isCorrelated ? 600 : 400,
                      lineHeight: 1.45
                    }}
                  >
                    {change.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
