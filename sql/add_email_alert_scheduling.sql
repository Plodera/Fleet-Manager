-- Migration: configurable expiry email delivery schedules
-- Run on existing deployments before restarting the application.

ALTER TABLE expiry_notification_rules
  ADD COLUMN IF NOT EXISTS preferred_time TEXT NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS schedule_timezone TEXT NOT NULL DEFAULT 'Africa/Lagos',
  ADD COLUMN IF NOT EXISTS times_per_day INTEGER NOT NULL DEFAULT 1;

ALTER TABLE expiry_notification_deliveries
  ADD COLUMN IF NOT EXISTS delivery_occurrence INTEGER NOT NULL DEFAULT 0;

DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'expiry_notification_deliveries'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) NOT ILIKE '%delivery_occurrence%'
  LOOP
    EXECUTE format('ALTER TABLE expiry_notification_deliveries DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS expiry_notification_delivery_occurrence_unique
  ON expiry_notification_deliveries(
    rule_id, entity_type, entity_id, recipient_key, channel, delivery_date, delivery_occurrence
  );