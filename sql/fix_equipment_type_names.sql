-- Fix equipment type name slugs so the inspection page correctly identifies
-- legacy types (Factory Vehicle / Transfer Trolley) using their normalized names.
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

-- Verify result
SELECT id, name, label_en, label_pt, is_active FROM equipment_types ORDER BY sort_order;
