-- Run on the on-prem PostgreSQL database before deploying this feature.
DO $$ BEGIN
  CREATE TYPE vehicle_compliance_document_type AS ENUM ('ownership', 'insurance', 'ivm');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS vehicle_compliance_documents (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  document_type vehicle_compliance_document_type NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_compliance_documents_vehicle_type_unique
  ON vehicle_compliance_documents(vehicle_id, document_type);