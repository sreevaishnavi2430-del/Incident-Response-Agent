import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncidents } from '../api';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { formatTimestamp, formatTimeDelta } from '../utils/formatters';
import { 
  AlertTriangle, 
  Clock, 
  Server, 
  ArrowRight, 
  RotateCw, 
  CheckCircle2, 
  Zap, 
  Layers, 
  SlidersHorizontal 
} from 'lucide-react';

export function IncidentListPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchIncidentList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIncidents();
      // Sort most recent first
      const sorted = [...data].sort(
        (a, b) => new Date(b.fired_at).getTime() - new Date(a.fired_at).getTime()
      );
      setIncidents(sorted);
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setError(err.message || 'Failed to communicate with incidents API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentList();
  }, []);

  // Filter logic
  const filteredIncidents = incidents.filter((inc) => {
    if (filterSeverity !== 'ALL' && inc.severity?.toLowerCase() !== filterSeverity.toLowerCase()) {
      return false;
    }
    if (filterStatus !== 'ALL' && inc.status?.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    return true;
  });

  const highCount = incidents.filter((i) => i.severity?.toLowerCase() === 'high').length;
  const diagnosedCount = incidents.filter((i) => i.status?.toLowerCase() === 'diagnosed').length;
  const openCount = incidents.filter((i) => i.status?.toLowerCase() === 'open').length;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '28px 24px' }}>
      {/* Top Banner / System Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
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
              backgroundColor: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Critical & High Severity
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>
              {loading ? '-' : highCount}
            </div>
          </div>
        </div>

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
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Correlated & Diagnosed
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#7dd3fc', fontFamily: 'var(--font-mono)' }}>
              {loading ? '-' : diagnosedCount}
            </div>
          </div>
        </div>

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
              backgroundColor: 'rgba(245, 158, 11, 0.14)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Correlation Window
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#fcd34d', fontFamily: 'var(--font-mono)' }}>
              T - 60 min
            </div>
          </div>
        </div>

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
              backgroundColor: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              MTTR Acceleration
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
              ~82% faster
            </div>
          </div>
        </div>
      </div>

      {/* Main Section Header with Filter Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '18px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Layers size={20} color="var(--border-highlight)" />
            <span>Active Incident Stream</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Deterministic signal-to-change correlation stream sorted by most recent alert.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: '6px',
              padding: '3px'
            }}
          >
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: filterSeverity === sev ? 'var(--text-primary)' : 'var(--text-muted)',
                  backgroundColor: filterSeverity === sev ? 'var(--bg-muted)' : 'transparent',
                  border: filterSeverity === sev ? '1px solid var(--border-card)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                {sev}
              </button>
            ))}
          </div>

          <button
            onClick={fetchIncidentList}
            disabled={loading}
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
              fontWeight: 600,
              transition: 'all 0.15s ease'
            }}
            title="Refresh Incidents"
          >
            <RotateCw size={13} style={{ transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease' }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton-pulse"
              style={{
                height: '92px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--sev-high-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            textAlign: 'center',
            color: 'var(--sev-high-text)'
          }}
        >
          <AlertTriangle size={32} style={{ margin: '0 auto 10px', color: '#ef4444' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
            Unable to Fetch Incidents
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {error}
          </p>
          <button
            onClick={fetchIncidentList}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredIncidents.length === 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}
        >
          <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Incidents Match Filters
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            All systems operate within acceptable error budgets.
          </p>
          {(filterSeverity !== 'ALL' || filterStatus !== 'ALL') && (
            <button
              onClick={() => { setFilterSeverity('ALL'); setFilterStatus('ALL'); }}
              style={{
                marginTop: '16px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-muted)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                border: '1px solid var(--border-card)'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Incident List */}
      {!loading && !error && filteredIncidents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredIncidents.map((incident) => {
            const isHigh = incident.severity?.toLowerCase() === 'high';
            return (
              <div
                key={incident.id}
                onClick={() => navigate(`/incident/${incident.id}`)}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  borderLeft: isHigh ? '4px solid var(--sev-high-border)' : '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-highlight)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                  e.currentTarget.style.borderColor = isHigh ? 'var(--border-card)' : 'var(--border-card)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {/* Top metadata row: Service, Severity, Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(56, 189, 248, 0.08)',
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

                    <SeverityBadge severity={incident.severity} size="sm" />
                    <StatusBadge status={incident.status} />

                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)'
                      }}
                    >
                      ID: #{incident.id}
                    </span>
                  </div>

                  {/* Alert Description */}
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      lineHeight: 1.4
                    }}
                  >
                    {incident.alert_description}
                  </div>

                  {/* Timestamp row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={12} />
                      <span>Fired: {formatTimestamp(incident.fired_at)}</span>
                    </span>
                  </div>
                </div>

                {/* Right Arrow Navigation Indicator */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>Investigate</span>
                  <ArrowRight size={14} color="var(--border-highlight)" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
