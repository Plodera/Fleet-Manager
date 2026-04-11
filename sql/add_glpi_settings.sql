-- GLPI Ticketing Integration Settings
-- Run this on the production server: sudo -u postgres psql -d your_db_name -f sql/add_glpi_settings.sql

CREATE TABLE IF NOT EXISTS glpi_settings (
  id                    SERIAL PRIMARY KEY,
  url                   TEXT NOT NULL DEFAULT '',
  app_token             TEXT NOT NULL DEFAULT '',
  user_token            TEXT NOT NULL DEFAULT '',
  sync_interval_minutes INTEGER NOT NULL DEFAULT 15,
  enabled               BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at          TIMESTAMP,
  last_error            TEXT,
  updated_at            TIMESTAMP DEFAULT NOW()
);
