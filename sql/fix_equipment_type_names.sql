-- Fix equipment type name slugs so the inspection page correctly identifies
-- legacy types (Factory Vehicle / Transfer Trolley) using their normalized names.
-- Also fills in missing label_en / label_pt values.
-- Run this on the on-prem server if equipment types appear blank or show
-- "No checklist items configured" in the Vehicle Inspections form.

-- Normalize "Factory Vehicle" variants → factory_vehicle
UPDATE equipment_types
SET name = 'factory_vehicle'
WHERE LOWER(REPLACE(name, ' ', '_')) = 'factory_vehicle'
  AND name != 'factory_vehicle';

-- Normalize "Transfer Trolley" variants → transfer_trolley
UPDATE equipment_types
SET name = 'transfer_trolley'
WHERE LOWER(REPLACE(name, ' ', '_')) = 'transfer_trolley'
  AND name != 'transfer_trolley';

-- Fill in missing English labels for legacy types
UPDATE equipment_types SET label_en = 'Factory Vehicle'
WHERE name = 'factory_vehicle' AND (label_en IS NULL OR label_en = '');

UPDATE equipment_types SET label_en = 'Transfer Trolley'
WHERE name = 'transfer_trolley' AND (label_en IS NULL OR label_en = '');

-- Fill in missing Portuguese labels for legacy types
UPDATE equipment_types SET label_pt = 'Veículo de Fábrica'
WHERE name = 'factory_vehicle' AND (label_pt IS NULL OR label_pt = '');

UPDATE equipment_types SET label_pt = 'Trolley de Transferência'
WHERE name = 'transfer_trolley' AND (label_pt IS NULL OR label_pt = '');

-- Verify result
SELECT id, name, label_en, label_pt, is_active FROM equipment_types ORDER BY sort_order;
