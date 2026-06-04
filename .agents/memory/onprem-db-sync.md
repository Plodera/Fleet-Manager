---
name: On-prem DB schema sync
description: On-prem PostgreSQL may be missing enum values or columns added after initial setup. Known gap: booking_status enum missing in_progress and completed values.
---

# On-prem database schema gaps

**Why:** The on-prem PostgreSQL database at 192.168.11.249 was set up at a point in time and does not receive automatic migrations when the schema evolves on Replit.

**Known missing values (fixed Jun 2025):**
- `booking_status` enum was missing `'in_progress'` and `'completed'` — caused "invalid input value for enum booking_status" errors on Start Trip and End Trip.

**Fix applied:**
```sql
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled';
```

**How to apply:** `psql $DATABASE_URL -c "ALTER TYPE ..."`

**How to apply future schema changes to on-prem:**
- For new enum values: `ALTER TYPE <enum_name> ADD VALUE IF NOT EXISTS '<value>';`
- For new columns: `ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <col> <type>;`
- Run via: `psql $DATABASE_URL -c "..."`
- No server restart needed for DB-only changes.

**On-prem deploy command:**
```
cd /opt/fleetcmd && git pull && npm run build && pm2 restart fleetcmd
```
