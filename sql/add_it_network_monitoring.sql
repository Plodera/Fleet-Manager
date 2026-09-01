-- Historical internet/network monitoring, issue follow-up, reports, and
-- long-retention FortiGate bandwidth support.
-- Safe to run repeatedly on an on-prem PostgreSQL installation.

CREATE TABLE IF NOT EXISTS it_host_checks (
  id SERIAL PRIMARY KEY,
  host_id INTEGER NOT NULL REFERENCES it_monitored_hosts(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  failure_reason TEXT,
  checked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS it_network_issues (
  id SERIAL PRIMARY KEY,
  host_id INTEGER REFERENCES it_monitored_hosts(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  target_date DATE,
  investigation_notes TEXT,
  corrective_action TEXT,
  resolution_details TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS it_network_issue_updates (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES it_network_issues(id) ON DELETE CASCADE,
  status TEXT,
  note TEXT,
  corrective_action TEXT,
  resolution_details TEXT,
  created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS it_monitoring_settings (
  id SERIAL PRIMARY KEY,
  reports_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  report_day_of_week INTEGER NOT NULL DEFAULT 1,
  report_hour INTEGER NOT NULL DEFAULT 8,
  report_recipients TEXT[] NOT NULL DEFAULT '{}',
  email_reports BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS it_monitoring_reports (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,
  week_end DATE NOT NULL,
  report_json JSONB NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  emailed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS it_host_checks_host_checked_idx
  ON it_host_checks(host_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS it_host_checks_checked_idx
  ON it_host_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS it_network_issues_status_idx
  ON it_network_issues(status, started_at DESC);
CREATE INDEX IF NOT EXISTS it_network_issues_host_type_idx
  ON it_network_issues(host_id, issue_type, status);
CREATE INDEX IF NOT EXISTS it_network_issue_updates_issue_idx
  ON it_network_issue_updates(issue_id, created_at DESC);

-- One unresolved outage/performance issue per host/type. This is the database
-- backstop for the monitor's application-level deduplication.
CREATE UNIQUE INDEX IF NOT EXISTS it_network_issues_open_dedupe_idx
  ON it_network_issues(host_id, issue_type)
  WHERE status <> 'resolved' AND host_id IS NOT NULL;

-- Keep enough bandwidth history for monthly graphs. Existing installations
-- may already have this table, so this is deliberately just retention metadata
-- through the application rather than a destructive table rewrite.
SELECT 'IT network monitoring tables created successfully' AS result;