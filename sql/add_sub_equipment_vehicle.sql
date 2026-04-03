-- Add vehicle_id FK to sub_equipment table
ALTER TABLE sub_equipment ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id);
