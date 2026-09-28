import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  HelpCircle, 
  RotateCw, 
  Wrench,
  FileText,
  Clock,
  Layers
} from 'lucide-react';
import { formatTimestamp } from '../utils/formatters';

export function DiagnosisPanel({
  incident,
  diagnosis,
  loading,
  error,
  onRetry,
  onOpenPostmortem
}) {
  const [activeChipId, setActiveChipId] = useState(null);

  // Helper to resolve human-readable labels from evidence change IDs
  const getEvidenceChangeDetails = (changeId) => {
    if (!incident || !incident.changes) {
      return { label: `Change #${changeId}`, time: '', type: 'change' };
    }
    const found = incident.changes.find((c) => String(c.id) === String(changeId));
    if (!found) {
      return { label: `Change #${changeId}`, time: '', type: 'change' };
    }

    // Extract compact summary e.g. "v2.14.0 deploy — 14:28"
    let compact = found.description;
    if (compact.includes('—')) {
      compact = compact.split('—')[0].trim();
    } else if (compact.length > 28) {
      compact = compact.slice(0, 28) + '...';
    }

    // Extract HH:mm UTC
    let timeStr = '';
    try {
      const d = new Date(found.changed_at);
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      timeStr = `${hh}:${mm} UTC`;
    } catch {
      timeStr = '';
    }

    return {
      label: `${compact} (${found.change_type})`,
      time: timeStr,
      fullChange: found
    };
  };

  // The critical click-through scroll and highlight action
  const handleEvidenceClick = (changeId) => {
    setActiveChipId(changeId);
    const targetElement = document.getElementById(`change-${changeId}`);

    if (targetElement) {
      // 1. Smooth scroll to timeline element
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // 2. Apply temporary highlight animation class
      targetElement.classList.remove('timeline-evidence-highlight');
      // Trigger reflow to restart CSS animation if clicked repeatedly
      void targetElement.offsetWidth;
      targetElement.classList.add('timeline-evidence-highlight');

      // 3. Remove class after animation finishes (2000ms)
      setTimeout(() => {
        targetElement.classList.remove('timeline-evidence-highlight');
        setActiveChipId(null);
      }, 2100);
    } else {
      console.warn(`Element #change-${changeId} not found in DOM`);
    }
  };

  // Confidence badge config
  const getConfidenceBadge = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return {
          label: 'HIGH CONFIDENCE (94%)',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: '#10b981',
          color: '#34d399'
        };
      case 'medium':
        return {
          label: 'MEDIUM CONFIDENCE (76%)',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: '#f59e0b',
          color: '#fcd34d'
        };
      case 'low':
      default:
        return {
          label: 'LOW CONFIDENCE (<50%)',
          bg: 'rgba(148, 163, 184, 0.15)',
          border: '#64748b',
          color: '#cbd5e1'
        };
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
                gap: '8px'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(() => {
              const conf = getConfidenceBadge(diagnosis.confidence);
              return (
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
                    backgroundColor: conf.bg,
                    border: `1px solid ${conf.border}`,
                    color: conf.color,
                    letterSpacing: '0.04em'
                  }}
                >
                  <CheckCircle2 size={12} />
                  {conf.label}
                </span>
              );
            })()}
          </div>
        )}
      </div>

      {/* STATE 1: LOADING / GENERATING DIAGNOSIS */}
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
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}
            >
              Analyzing Correlated Signals...
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              Synthesizing alert trace against recent deploy & configuration changes
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: ERROR OCCURRED */}
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
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {error}
          </p>
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

      {/* STATE 3: DIAGNOSIS PENDING (CALM / NORMAL STATE) */}
      {!loading && !error && !diagnosis && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(100, 116, 139, 0.15)',
              border: '1px solid var(--border-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}
            >
              Diagnosis Pending
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                maxWidth: '380px',
                lineHeight: 1.45
              }}
            >
              Incident was detected recently. The deterministic pipeline has completed correlation, and LLM root-cause synthesis will execute upon on-call triage trigger.
            </p>
          </div>
          <button
            onClick={onRetry}
            style={{
              marginTop: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)'
            }}
          >
            <Sparkles size={13} />
            <span>Trigger AI Diagnosis Now</span>
          </button>
        </div>
      )}

      {/* STATE 4: DIAGNOSIS AVAILABLE & READY */}
      {!loading && !error && diagnosis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 1. Root Cause Summary (Large Bold Headline) */}
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
                gap: '6px'
              }}
            >
              <Sparkles size={12} color="#38bdf8" />
              <span>Root-Cause Hypothesis</span>
            </div>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.5,
                letterSpacing: '-0.01em'
              }}
            >
              {diagnosis.root_cause_summary}
            </h3>
          </div>

          {/* 2. Suggested Action (Distinct Highlighted Box - The Actionable Payoff!) */}
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
                marginBottom: '8px'
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
                <span>Suggested Actionable Fix (Human-In-The-Loop)</span>
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
                REQUIRES APPROVAL
              </span>
            </div>

            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#ecfdf5',
                lineHeight: 1.55
              }}
            >
              {diagnosis.suggested_action}
            </div>
          </div>

          {/* 3. Correlated Evidence Chips (CRITICAL CLICK-THROUGH INTERACTION) */}
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
                justifyContent: 'space-between'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={12} color="var(--border-highlight)" />
                <span>Citing Evidence Events ({diagnosis.evidence_change_ids?.length || 0})</span>
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-code)' }}>
                Click chip to inspect in timeline ↓
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {diagnosis.evidence_change_ids && diagnosis.evidence_change_ids.length > 0 ? (
                diagnosis.evidence_change_ids.map((changeId) => {
                  const details = getEvidenceChangeDetails(changeId);
                  const isSelected = activeChipId === changeId;

                  return (
                    <button
                      key={changeId}
                      onClick={() => handleEvidenceClick(changeId)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        backgroundColor: isSelected
                          ? 'rgba(56, 189, 248, 0.25)'
                          : 'rgba(56, 189, 248, 0.1)',
                        border: isSelected
                          ? '1.5px solid #38bdf8'
                          : '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#f0f9ff',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected
                          ? '0 0 12px rgba(56, 189, 248, 0.5)'
                          : 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
                        e.currentTarget.style.borderColor = '#38bdf8';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isSelected
                          ? 'rgba(56, 189, 248, 0.25)'
                          : 'rgba(56, 189, 248, 0.1)';
                        e.currentTarget.style.borderColor = isSelected
                          ? '#38bdf8'
                          : 'rgba(56, 189, 248, 0.35)';
                        e.currentTarget.style.transform = 'none';
                      }}
                      title="Click to jump and highlight this change event in the chronological timeline"
                    >
                      <span>{details.label}</span>
                      {details.time && (
                        <span style={{ color: 'var(--text-code)', opacity: 0.85 }}>
                          • {details.time}
                        </span>
                      )}
                      <ArrowUpRight size={13} color="#38bdf8" />
                    </button>
                  );
                })
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  No discrete change IDs referenced.
                </div>
              )}
            </div>
          </div>

          {/* Action Footer: Generate Postmortem Draft (Stretch Goal) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              paddingTop: '6px'
            }}
          >
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
