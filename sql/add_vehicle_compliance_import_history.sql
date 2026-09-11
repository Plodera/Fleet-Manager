CREATE TABLE IF NOT EXISTS vehicle_compliance_imports (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  options JSONB NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
  ,undo_at TIMESTAMP, undo_actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  undo_actor_name TEXT, undo_status TEXT
);

CREATE TABLE IF NOT EXISTS vehicle_compliance_import_rows (
  id SERIAL PRIMARY KEY,
  import_id INTEGER NOT NULL REFERENCES vehicle_compliance_imports(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  audited_vehicle_id INTEGER,
  action TEXT NOT NULL,
  before_values JSONB,
  after_values JSONB,
  changed_fields JSONB NOT NULL,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  message TEXT, undo_status TEXT, undo_warning TEXT, undo_skipped_fields JSONB
);

CREATE INDEX IF NOT EXISTS vehicle_compliance_import_rows_import_idx
  ON vehicle_compliance_import_rows(import_id);

ALTER TABLE vehicle_compliance_import_rows
  ADD COLUMN IF NOT EXISTS undo_skipped_fields JSONB;

CREATE TABLE IF NOT EXISTS vehicle_compliance_import_undo_attempts (
  id SERIAL PRIMARY KEY,
  import_id INTEGER NOT NULL REFERENCES vehicle_compliance_imports(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS vehicle_compliance_import_undo_attempt_rows (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES vehicle_compliance_import_undo_attempts(id) ON DELETE CASCADE,
  import_row_id INTEGER REFERENCES vehicle_compliance_import_rows(id) ON DELETE SET NULL,
  row_number INTEGER NOT NULL,
  attempted_fields JSONB NOT NULL,
  restored_fields JSONB NOT NULL,
  skipped_fields JSONB NOT NULL,
  status TEXT NOT NULL,
  warning TEXT
);

CREATE INDEX IF NOT EXISTS vehicle_compliance_import_undo_attempts_import_idx
  ON vehicle_compliance_import_undo_attempts(import_id);

CREATE INDEX IF NOT EXISTS vehicle_compliance_import_undo_attempt_rows_attempt_idx
  ON vehicle_compliance_import_undo_attempt_rows(attempt_id);