import React, { useState } from 'react';
import {
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  RotateCw,
  Wrench,
  FileText,
  Layers,
  Scale
} from 'lucide-react';
import { formatTimestamp } from '../utils/formatters';

const SCORE_COLORS = {
  temporal: '#f59e0b',
  change_type: '#a855f7',
  keywords: '#38bdf8',
  blast_radius: '#ef4444'
};

const SCORE_LABELS = {
  temporal: 'temporal',
  change_type: 'change type',
  keywords: 'narrative',
  blast_radius: 'blast radius'
};

export function DiagnosisPanel({
  incident,
  diagnosis,
  loading,
  error,
  onRetry,
  onOpenPostmortem
}) {
  const [activeChipId, setActiveChipId] = useState(null);

  const correlatedChanges = (incident?.changes || []).filter((c) => c.correlated);
  const consideredChanges = (incident?.changes || []).filter((c) => c.engine_verdict === 'considered');

  const getEvidenceChangeDetails = (changeId) => {
    const found = correlatedChanges.find((c) => String(c.id) === String(changeId));
    if (!found) {
      return { label: `Change #${changeId}`, time: '', fullChange: null };
    }
    let compact = found.description || `Change #${changeId}`;
    if (compact.includes('—')) {
      compact = compact.split('—')[0].trim();
    } else if (compact.length > 34) {
      compact = `${compact.slice(0, 34)}…`;
    }
    let timeStr = '';
    try {
      const d = new Date(found.changed_at);
      timeStr = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
    } catch {
      timeStr = '';
    }
    return { label: `${compact} (${found.change_type})`, time: timeStr, fullChange: found };
  };

  const handleEvidenceClick = (changeId) => {
    setActiveChipId(changeId);
    const targetElement = document.getElementById(`change-${changeId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.remove('timeline-evidence-highlight');
      void targetElement.offsetWidth; // restart CSS animation
      targetElement.classList.add('timeline-evidence-highlight');
      setTimeout(() => {
        targetElement.classList.remove('timeline-evidence-highlight');
        setActiveChipId(null);
      }, 2100);
    } else {
      console.warn(`Element #change-${changeId} not found in DOM`);
    }
  };

  const getConfidenceBadge = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return { label: 'HIGH CONFIDENCE', bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', color: '#34d399' };
      case 'medium':
        return { label: 'MEDIUM CONFIDENCE', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', color: '#fcd34d' };
      case 'low':
      default:
        return { label: 'LOW CONFIDENCE', bg: 'rgba(148, 163, 184, 0.15)', border: '#64748b', color: '#cbd5e1' };
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-card)',
          paddingBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(168, 85, 247, 0.14)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc'
            }}
          >
            <BrainCircuit size={20} />
          </div>
          <div>
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <span>AI Root-Cause Diagnosis</span>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                  color: '#d8b4fe',
                  border: '1px solid rgba(168, 85, 247, 0.3)'
                }}
              >
                REASONING LAYER
              </span>
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Cross-references correlated events to explain the failure mechanism.
            </div>
          </div>
        </div>

        {diagnosis && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              backgroundColor: getConfidenceBadge(diagnosis.confidence).bg,
              border: `1px solid ${getConfidenceBadge(diagnosis.confidence).border}`,
              color: getConfidenceBadge(diagnosis.confidence).color,
              letterSpacing: '0.04em'
            }}
            title="AI-reported confidence — never a fabricated percentage"
          >
            <CheckCircle2 size={12} />
            {getConfidenceBadge(diagnosis.confidence).label}
          </span>
        )}
      </div>

      {/* STATE 1: LOADING */}
      {loading && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px dashed var(--border-highlight)',
            borderRadius: 'var(--radius-md)',
            padding: '36px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '2px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}
          >
            <RotateCw size={22} className="radar-dot" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Analyzing Correlated Signals…
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Synthesizing alert trace against recent deploy & configuration changes
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: ERROR */}
      {!loading && error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid var(--sev-high-border)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            textAlign: 'center'
          }}
        >
          <AlertCircle size={26} color="#ef4444" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--sev-high-text)', marginBottom: '4px' }}>
            Diagnosis Generation Incomplete
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{error}</p>
          <button
            onClick={onRetry}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-muted)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid var(--border-card)'
            }}
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* STATE 3: READY */}
      {!loading && !error && diagnosis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 1. Root Cause Summary */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '20px'
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={12} color="#38bdf8" />
                <span>Root-Cause Hypothesis</span>
              </span>
              {diagnosis.model && (
                <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-code)' }} title="Which model produced this diagnosis">
                  {diagnosis.model}
                </span>
              )}
            </div>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                letterSpacing: '-0.01em'
              }}
            >
              {diagnosis.root_cause_summary}
            </h3>
          </div>

          {/* 2. Suggested Action */}
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1.5px solid #10b981',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.12)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                <Wrench size={14} />
                <span>Suggested First Step</span>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: '#6ee7b7',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  padding: '1px 6px',
                  borderRadius: '3px'
                }}
              >
                HUMAN APPROVAL REQUIRED
              </span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#ecfdf5', lineHeight: 1.55 }}>
              {diagnosis.suggested_action}
            </div>
          </div>

          {/* 3. Correlated Evidence Chips */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px'
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={12} color="var(--border-highlight)" />
                <span>Citing Evidence Events ({diagnosis.evidence_change_ids?.length || 0})</span>
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-code)', textTransform: 'none', letterSpacing: 0 }}>
                Click chip to inspect in timeline ↓
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {diagnosis.evidence_change_ids && diagnosis.evidence_change_ids.length > 0 ? (
                diagnosis.evidence_change_ids.map((changeId) => {
                  const details = getEvidenceChangeDetails(changeId);
                  const isSelected = activeChipId === String(changeId);
                  const score = details.fullChange?.correlation_score;

                  return (
                    <button
                      key={changeId}
                      onClick={() => handleEvidenceClick(String(changeId))}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.1)',
                        border: isSelected ? '1.5px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#f0f9ff',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.5)' : 'none',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
                        e.currentTarget.style.borderColor = '#38bdf8';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.1)';
                        e.currentTarget.style.borderColor = isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.35)';
                        e.currentTarget.style.transform = 'none';
                      }}
                      title="Click to jump and highlight this change event in the chronological timeline"
                    >
                      <span>{details.label}</span>
                      {typeof score === 'number' && (
                        <span style={{ color: '#7dd3fc', fontWeight: 800 }}>{score}/100</span>
                      )}
                      {details.time && (
                        <span style={{ color: 'var(--text-code)', opacity: 0.85 }}>• {details.time}</span>
                      )}
                      <ArrowUpRight size={13} color="#38bdf8" />
                    </button>
                  );
                })
              ) : (
                <div
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Scale size={14} color="var(--text-muted)" />
                  <span>
                    No change events were cited. The engine found no correlated change — the AI is explicitly
                    refusing to invent a cause.
                  </span>
                </div>
              )}
            </div>

            {/* Score methodology footnote */}
            {diagnosis.evidence_change_ids?.length > 0 && correlatedChanges.length > 0 && (
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px dashed var(--border-subtle)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                {(correlatedChanges.find(
                  (c) => String(c.id) === String(diagnosis.evidence_change_ids[0])
                )?.score_components) && (
                  <>
                    <span>score = temporal + change type + narrative + blast radius</span>
                    <span style={{ color: 'var(--text-code)' }}>
                      e.g. {diagnosis.evidence_change_ids[0]}:{' '}
                      {Object.entries(
                        correlatedChanges.find((c) => String(c.id) === String(diagnosis.evidence_change_ids[0]))
                          .score_components
                      )
                        .map(([key, value]) => `${SCORE_LABELS[key] || key} ${value}`)
                        .join(' + ')}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 4. Considered-but-weak candidates (engine transparency) */}
          {consideredChanges.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px dashed var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '8px'
                }}
              >
                Considered by engine, below correlation threshold ({consideredChanges.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {consideredChanges.slice(0, 3).map((change) => (
                  <div
                    key={change.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {change.description}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {change.correlation_score}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
            <button
              onClick={onOpenPostmortem}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-muted)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid var(--border-card)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-highlight)';
                e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-card)';
                e.currentTarget.style.backgroundColor = 'var(--bg-muted)';
              }}
            >
              <FileText size={15} color="var(--border-highlight)" />
              <span>Draft Postmortem Summary</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
