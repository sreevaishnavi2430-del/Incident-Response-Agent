import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getIncident, getDiagnosis } from '../api';
import { IncidentTimeline } from '../components/IncidentTimeline';
import { DiagnosisPanel } from '../components/DiagnosisPanel';
import { PostmortemModal } from '../components/PostmortemModal';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { formatTimestamp } from '../utils/formatters';
import { 
  ArrowLeft, 
  Server, 
  Clock, 
  AlertTriangle, 
  RotateCw,
  Share2,
  Check
} from 'lucide-react';

export function IncidentDetailPage() {
  const { id } = useParams();

  const [incident, setIncident] = useState(null);
  const [incidentLoading, setIncidentLoading] = useState(true);
  const [incidentError, setIncidentError] = useState(null);

  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(true);
  const [diagnosisError, setDiagnosisError] = useState(null);

  const [showPostmortem, setShowPostmortem] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. Fetch Incident Data (Alert + Changes)
  const fetchIncidentData = async () => {
    setIncidentLoading(true);
    setIncidentError(null);
    try {
      const data = await getIncident(id);
      setIncident(data);
    } catch (err) {
      console.error('Failed to load incident data:', err);
      setIncidentError(err.message || `Failed to retrieve incident #${id}`);
    } finally {
      setIncidentLoading(false);
    }
  };

  // 2. Fetch Diagnosis Data (LLM Reasoning Layer)
  const fetchDiagnosisData = async () => {
    setDiagnosisLoading(true);
    setDiagnosisError(null);
    try {
      const diag = await getDiagnosis(id);
      setDiagnosis(diag);
    } catch (err) {
      console.error('Failed to load diagnosis:', err);
      setDiagnosisError(err.message || 'Error occurred while contacting reasoning layer');
    } finally {
      setDiagnosisLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentData();
    fetchDiagnosisData();
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Full page loading skeleton
  if (incidentLoading) {
    return (
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="skeleton-pulse" style={{ height: '70px', borderRadius: 'var(--radius-md)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="skeleton-pulse" style={{ height: '420px', borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton-pulse" style={{ height: '420px', borderRadius: 'var(--radius-lg)' }} />
          </div>
        </div>
      </div>
    );
  }

  // Full page error state
  if (incidentError) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 24px' }}>
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--sev-high-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px',
            textAlign: 'center'
          }}
        >
          <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--sev-high-text)', marginBottom: '8px' }}>
            Failed to Load Incident #{id}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            {incidentError}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-muted)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--border-card)'
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Incidents</span>
            </Link>
            <button
              onClick={() => {
                fetchIncidentData();
                fetchDiagnosisData();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#ef4444',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <RotateCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* Top Incident Summary Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <span>INCIDENTS</span>
              <span>/</span>
            </Link>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-code)'
              }}
            >
              INCIDENT #{incident.id}
            </span>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: 'var(--text-code)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <Server size={12} />
              <span>{incident.service}</span>
            </div>

            <SeverityBadge severity={incident.alert?.severity} size="sm" />
            <StatusBadge status={incident.status} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s ease'
              }}
              title="Copy link to incident"
            >
              {copiedLink ? <Check size={13} color="#34d399" /> : <Share2 size={13} />}
              <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '10px' }}>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              lineHeight: 1.3
            }}
          >
            {incident.alert?.description}
          </h1>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <Clock size={13} />
            <span>Fired: {formatTimestamp(incident.alert?.fired_at)}</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Timeline (Evidence) + Diagnosis (Reasoning) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
          gap: '24px',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Chronological Correlated Timeline */}
        <div>
          <IncidentTimeline incident={incident} />
        </div>

        {/* Right Column: AI Root-Cause Diagnosis & Suggested Fix */}
        <div style={{ position: 'sticky', top: '78px' }}>
          <DiagnosisPanel
            incident={incident}
            diagnosis={diagnosis}
            loading={diagnosisLoading}
            error={diagnosisError}
            onRetry={fetchDiagnosisData}
            onOpenPostmortem={() => setShowPostmortem(true)}
          />
        </div>
      </div>

      {/* Stretch Goal Modal: Postmortem Draft */}
      {showPostmortem && (
        <PostmortemModal
          incidentId={incident.id}
          onClose={() => setShowPostmortem(false)}
        />
      )}
    </div>
  );
}
