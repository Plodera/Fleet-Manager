-- IT Host Types: user-configurable device type categories
-- Run on on-prem server: sudo -u postgres psql -d fleetcmd -f /opt/fleetcmd/sql/add_it_host_types.sql

-- 1. Create the configurable host types table
CREATE TABLE IF NOT EXISTS it_host_types (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label_en TEXT NOT NULL,
  label_pt TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'monitor',
  color TEXT NOT NULL DEFAULT 'blue',
  is_internet_link BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 2. Seed default types (idempotent)
INSERT INTO it_host_types (slug, label_en, label_pt, icon, color, is_internet_link, sort_order)
VALUES
  ('internet_link', 'Internet Link', 'Link Internet',   'globe',     'green',  true,  0),
  ('camera',        'Camera',        'Câmera',           'camera',    'blue',   false, 1),
  ('switch',        'Switch',        'Switch',           'git-merge', 'cyan',   false, 2),
  ('wireless_ap',   'Access Point',  'Ponto de Acesso',  'wifi',      'violet', false, 3),
  ('printer',       'Printer',       'Impressora',       'printer',   'rose',   false, 4),
  ('other',         'Other',         'Outros',           'monitor',   'gray',   false, 5)
ON CONFLICT (slug) DO NOTHING;

-- 3. Migrate host_type column from enum to text (idempotent — safe to re-run)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'it_monitored_hosts'
      AND column_name = 'host_type'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE it_monitored_hosts ALTER COLUMN host_type TYPE TEXT USING host_type::TEXT;
  END IF;
END $$;

-- 4. Drop old enum type (safe — column is now text)
DROP TYPE IF EXISTS it_host_type;

SELECT 'IT host types migration complete' AS result;
