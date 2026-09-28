import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, ShieldAlert, Cpu, ArrowLeft } from 'lucide-react';
import { USE_REAL_BACKEND } from '../api';

export function Header() {
  const location = useLocation();
  const isDetail = location.pathname.startsWith('/incident/');

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-card)',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isDetail && (
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-muted)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid var(--border-subtle)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--border-card)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <ArrowLeft size={14} />
              <span>All Incidents</span>
            </Link>
          )}

          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.35)'
              }}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    textTransform: 'uppercase'
                  }}
                >
                  Incident Response Agent
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    color: 'var(--text-code)',
                    border: '1px solid rgba(56, 189, 248, 0.3)'
                  }}
                >
                  OPS-CORE
                </span>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                Deterministic Correlation Engine + AI Reasoning Layer
              </div>
            </div>
          </Link>
        </div>

        {/* Status Bar Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '5px 12px',
              borderRadius: '20px'
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#10b981'
              }}
              className="radar-dot"
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#34d399',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.03em'
              }}
            >
              PIPELINE ONLINE
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-muted)',
              border: '1px solid var(--border-subtle)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)'
            }}
            title={USE_REAL_BACKEND ? 'Connected to live Flask backend' : 'Using seeded realistic incident dataset with simulated latency'}
          >
            <Cpu size={13} color="var(--text-muted)" />
            <span>Mode:</span>
            <span style={{ color: USE_REAL_BACKEND ? '#38bdf8' : '#fbbf24', fontWeight: 600 }}>
              {USE_REAL_BACKEND ? 'FLASK LIVE' : 'SIMULATED SEED'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
