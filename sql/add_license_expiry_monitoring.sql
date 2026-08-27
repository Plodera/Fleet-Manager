-- Migration: License expiry monitoring and company documents
-- Run on existing deployments: psql -U <user> -d <dbname> -f sql/add_license_expiry_monitoring.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS license_expiry_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_expiry_date DATE;

CREATE TABLE IF NOT EXISTS company_documents (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  document_type TEXT,
  expiry_date   DATE NOT NULL,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_document_access (
  id                  SERIAL PRIMARY KEY,
  company_document_id INTEGER NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(company_document_id, user_id)
);

CREATE TABLE IF NOT EXISTS expiry_notification_rules (
  id          SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  threshold_days INTEGER,
  send_email  BOOLEAN NOT NULL DEFAULT TRUE,
  send_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expiry_notification_recipients (
  id          SERIAL PRIMARY KEY,
  rule_id     INTEGER NOT NULL REFERENCES expiry_notification_rules(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT,
  CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS expiry_notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_id     INTEGER REFERENCES expiry_notification_rules(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  entity_name TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expiry_notification_deliveries (
  id            SERIAL PRIMARY KEY,
  rule_id       INTEGER NOT NULL REFERENCES expiry_notification_rules(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     INTEGER NOT NULL,
  recipient_key TEXT NOT NULL,
  channel       TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  success       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(rule_id, entity_type, entity_id, recipient_key, channel, delivery_date)
);

CREATE INDEX IF NOT EXISTS expiry_notifications_user_status_idx
  ON expiry_notifications(user_id, status, created_at DESC);