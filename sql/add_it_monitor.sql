-- IT Operations Monitor Tables
-- Run on on-prem server: sudo -u postgres psql -d fleetcmd -f /opt/fleetcmd/sql/add_it_monitor.sql

DO $$ BEGIN
  CREATE TYPE it_host_type AS ENUM ('internet_link', 'camera', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS it_monitored_hosts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  host_type it_host_type NOT NULL DEFAULT 'camera',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  department_id INTEGER REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS it_host_status (
  id SERIAL PRIMARY KEY,
  host_id INTEGER NOT NULL REFERENCES it_monitored_hosts(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  response_time_ms INTEGER,
  checked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS it_kpis (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  label_en TEXT NOT NULL DEFAULT '',
  label_pt TEXT NOT NULL DEFAULT '',
  unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS it_kpi_values (
  id SERIAL PRIMARY KEY,
  kpi_id INTEGER NOT NULL REFERENCES it_kpis(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL,
  period_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_it_host_status_host_id ON it_host_status(host_id);
CREATE INDEX IF NOT EXISTS idx_it_host_status_checked_at ON it_host_status(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_it_kpi_values_kpi_id ON it_kpi_values(kpi_id);

SELECT 'IT monitor tables created successfully' AS result;
