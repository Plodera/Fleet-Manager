CREATE TABLE IF NOT EXISTS email_delivery_health (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  warning_since TIMESTAMP,
  last_failure_at TIMESTAMP,
  last_success_at TIMESTAMP,
  last_error TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);