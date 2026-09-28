import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncidents, getStats, getSimulateScenarios, runSimulation } from '../api';
import { StatCards } from '../components/StatCards';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { formatTimestamp } from '../utils/formatters';
import {
  AlertTriangle,
  Clock,
  Server,
  ArrowRight,
  RotateCw,
  CheckCircle2,
  Zap,
  Layers,
  Search,
  Play,
  ChevronDown
} from 'lucide-react';

export function IncidentListPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const [scenarios, setScenarios] = useState([]);
  const [simOpen, setSimOpen] = useState(false);
  const [simBusy, setSimBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const simRef = useRef(null);

  const fetchIncidentList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, statsData] = await Promise.all([getIncidents(), getStats()]);
      const sorted = [...data].sort(
        (a, b) => new Date(b.fired_at).getTime() - new Date(a.fired_at).getTime()
      );
      setIncidents(sorted);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setError(err.message || 'Failed to communicate with incidents API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidentList();
    getSimulateScenarios().then(setScenarios).catch(() => setScenarios([]));
  }, [fetchIncidentList]);

  // Close the simulate dropdown on outside click
  useEffect(() => {
    const handler = (event) => {
      if (simRef.current && !simRef.current.contains(event.target)) setSimOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSimulate = async (scenario) => {
    setSimOpen(false);
    setSimBusy(scenario.key);
    try {
      const result = await runSimulation(scenario.key);
      await fetchIncidentList();
      setToast(
        result.correlated_count > 0
          ? `New incident #${result.incident_id}: engine correlated ${result.correlated_count} change(s)`
          : `New incident #${result.incident_id}: no correlated changes found — engine honestly reports null`
      );
      setTimeout(() => setToast(null), 5000);
      navigate(`/incident/${result.incident_id}`);
    } catch (err) {
      setToast(`Simulation failed: ${err.message}`);
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSimBusy(null);
    }
  };

  const filteredIncidents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return incidents.filter((inc) => {
      if (filterSeverity !== 'ALL' && inc.severity?.toLowerCase() !== filterSeverity.toLowerCase()) return false;
      if (filterStatus !== 'ALL' && inc.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
      if (term && !`${inc.service} ${inc.alert_description}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [incidents, filterSeverity, filterStatus, search]);

  const activeFilters = filterSeverity !== 'ALL' || filterStatus !== 'ALL' || search.trim() !== '';

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '28px 24px' }}>
      <StatCards stats={stats} loading={loading} />

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
              fontWeight: 600,
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

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service or alert…"
              style={{
                padding: '6px 10px 6px 28px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                width: '210px',
                outline: 'none'
              }}
            />
          </div>

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

          {/* Simulate incoming alert (live demo) */}
          <div ref={simRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setSimOpen((open) => !open)}
              disabled={simBusy !== null}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                fontSize: '12px',
                fontWeight: 600,
                opacity: simBusy ? 0.6 : 1,
                transition: 'all 0.15s ease'
              }}
              title="Replay a realistic alert scenario through the webhook ingest pipeline"
            >
              {simBusy ? <RotateCw size={13} className="radar-dot" /> : <Play size={13} />}
              <span>{simBusy ? 'Ingesting…' : 'Simulate alert'}</span>
              <ChevronDown size={12} />
            </button>
            {simOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  minWidth: '330px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '8px',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
                  zIndex: 60,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    padding: '9px 14px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  Replay scenario via webhook ingest
                </div>
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.key}
                    onClick={() => handleSimulate(scenario)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {scenario.label}
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-code)', marginTop: '2px' }}>
                      {scenario.service}
                    </div>
                  </button>
                ))}
              </div>
            )}
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

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#7dd3fc',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <Zap size={15} />
          <span>{toast}</span>
        </div>
      )}

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
          {activeFilters && (
            <button
              onClick={() => {
                setFilterSeverity('ALL');
                setFilterStatus('ALL');
                setSearch('');
              }}
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
                  e.currentTarget.style.borderColor = 'var(--border-card)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
                  {/* Top metadata row */}
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

                    {incident.correlated_count > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          color: '#38bdf8',
                          backgroundColor: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}
                        title="Changes the deterministic engine correlated with this alert"
                      >
                        <Zap size={11} />
                        {incident.correlated_count} correlated{incident.top_score ? ` · top score ${incident.top_score}` : ''}
                      </span>
                    )}

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
                      fontWeight: 500,
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
