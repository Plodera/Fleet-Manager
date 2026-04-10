-- Migration: Add Status Tracker & Notifications tables
-- Run on existing deployments: psql -U <user> -d <dbname> -f sql/add_trackers.sql

CREATE TABLE IF NOT EXISTS trackers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  department_id INTEGER REFERENCES departments(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracker_items (
  id            SERIAL PRIMARY KEY,
  tracker_id    INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  serial_number TEXT,
  location      TEXT,
  quantity      INTEGER DEFAULT 1,
  purchase_date DATE,
  expiry_date   DATE,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracker_notification_rules (
  id               SERIAL PRIMARY KEY,
  tracker_id       INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  trigger_type     TEXT NOT NULL,
  threshold_days   INTEGER,
  recipients       TEXT[] NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at      TIMESTAMP,
  last_match_count INTEGER,
  created_at       TIMESTAMP DEFAULT NOW()
);
