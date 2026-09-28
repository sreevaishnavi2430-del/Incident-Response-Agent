-- Incident Response Agent - Supabase / Postgres schema
-- Run in the Supabase SQL editor (or `supabase db push`) before seeding.

create table if not exists services (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    owner text,
    tier text,
    created_at timestamptz not null default now()
);

create table if not exists alerts (
    id uuid primary key default gen_random_uuid(),
    service_id uuid not null references services (id) on delete cascade,
    source text not null default 'webhook',
    description text not null,
    severity text not null default 'medium'
        check (severity in ('low', 'medium', 'high', 'critical')),
    fired_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists changes (
    id uuid primary key default gen_random_uuid(),
    service_id uuid not null references services (id) on delete cascade,
    change_type text not null
        check (change_type in ('deploy', 'config', 'commit', 'feature_flag', 'rollback')),
    actor text,
    description text not null,
    changed_at timestamptz not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists incidents (
    id uuid primary key default gen_random_uuid(),
    alert_id uuid not null references alerts (id) on delete cascade,
    correlated_change_ids uuid[] not null default '{}',
    status text not null default 'open'
        check (status in ('open', 'diagnosed', 'resolved')),
    created_at timestamptz not null default now()
);

create table if not exists diagnoses (
    id uuid primary key default gen_random_uuid(),
    incident_id uuid not null references incidents (id) on delete cascade,
    root_cause_summary text not null,
    confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
    suggested_action text not null,
    evidence_change_ids uuid[] not null default '{}',
    model text,
    generated_at timestamptz not null default now()
);

-- Correlation queries always filter by service + time window.
create index if not exists idx_alerts_service_fired on alerts (service_id, fired_at desc);
create index if not exists idx_changes_service_changed on changes (service_id, changed_at desc);
create index if not exists idx_incidents_alert on incidents (alert_id);
create index if not exists idx_diagnoses_incident on diagnoses (incident_id);
