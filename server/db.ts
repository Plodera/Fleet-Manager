import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isLocalDb = process.env.DB_DRIVER === 'pg' || 
                  process.env.DATABASE_URL?.includes('localhost') || 
                  process.env.DATABASE_URL?.includes('127.0.0.1');

let _pool: any = null;
let _db: any = null;

export async function initDatabase() {
  if (_db) return { pool: _pool, db: _db };
  
  if (isLocalDb) {
    const pg = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    _pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(_pool, { schema });
    console.log('Database: Using local PostgreSQL driver');
  } else {
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import('ws');
    neonConfig.webSocketConstructor = ws.default;
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle({ client: _pool, schema });
    console.log('Database: Using Neon serverless driver');
  }
  
  // Auto-create tables that may be missing on older installations
  try {
    await _pool.query(`
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
      )
    `);
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS hikvision_nvrs (
        id                  SERIAL PRIMARY KEY,
        name                TEXT NOT NULL,
        ip_address          TEXT NOT NULL,
        port                INTEGER NOT NULL DEFAULT 80,
        username            TEXT NOT NULL DEFAULT '',
        password            TEXT NOT NULL DEFAULT '',
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        notes               TEXT,
        last_synced_at      TIMESTAMP,
        last_error          TEXT,
        last_camera_total   INTEGER,
        last_camera_online  INTEGER,
        created_at          TIMESTAMP DEFAULT NOW()
      )
    `);
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS hikvision_global_settings (
        id                    SERIAL PRIMARY KEY,
        sync_interval_minutes INTEGER NOT NULL DEFAULT 1,
        enabled               BOOLEAN NOT NULL DEFAULT FALSE,
        dashboard_id          INTEGER,
        last_sync_at          TIMESTAMP,
        last_error            TEXT,
        updated_at            TIMESTAMP DEFAULT NOW()
      )
    `);
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS fortigate_settings (
        id                     SERIAL PRIMARY KEY,
        host                   TEXT NOT NULL DEFAULT '',
        port                   INTEGER NOT NULL DEFAULT 443,
        api_token              TEXT NOT NULL DEFAULT '',
        poll_interval_minutes  INTEGER NOT NULL DEFAULT 1,
        enabled                BOOLEAN NOT NULL DEFAULT FALSE,
        interfaces             TEXT NOT NULL DEFAULT '[]',
        interface_labels       TEXT NOT NULL DEFAULT '{}',
        low_bandwidth_threshold_mbps NUMERIC NOT NULL DEFAULT 0,
        low_bandwidth_duration_minutes INTEGER NOT NULL DEFAULT 10,
        last_sync_at           TIMESTAMP,
        last_error             TEXT,
        updated_at             TIMESTAMP DEFAULT NOW()
      )
    `);
    // Migrate old column names if they exist
    await _pool.query(`ALTER TABLE fortigate_settings ADD COLUMN IF NOT EXISTS port INTEGER NOT NULL DEFAULT 443`).catch(() => {});
    await _pool.query(`ALTER TABLE fortigate_settings ADD COLUMN IF NOT EXISTS poll_interval_minutes INTEGER NOT NULL DEFAULT 1`).catch(() => {});
    await _pool.query(`ALTER TABLE fortigate_settings ADD COLUMN IF NOT EXISTS interface_labels TEXT NOT NULL DEFAULT '{}'`).catch(() => {});
    await _pool.query(`ALTER TABLE fortigate_settings ADD COLUMN IF NOT EXISTS low_bandwidth_threshold_mbps NUMERIC NOT NULL DEFAULT 0`).catch(() => {});
    await _pool.query(`ALTER TABLE fortigate_settings ADD COLUMN IF NOT EXISTS low_bandwidth_duration_minutes INTEGER NOT NULL DEFAULT 10`).catch(() => {});
    // rename old columns to new names only if old columns still exist
    await _pool.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fortigate_settings' AND column_name='poll_interval_seconds') THEN ALTER TABLE fortigate_settings RENAME COLUMN poll_interval_seconds TO poll_interval_minutes_old; END IF; END $$`).catch(() => {});
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS fortigate_bandwidth (
        id             SERIAL PRIMARY KEY,
        sampled_at     TIMESTAMP NOT NULL DEFAULT NOW(),
        interface_name TEXT NOT NULL,
        tx_kbps        TEXT NOT NULL DEFAULT '0',
        rx_kbps        TEXT NOT NULL DEFAULT '0'
      )
    `);
    // Migrate old bandwidth column names if they exist
    await _pool.query(`ALTER TABLE fortigate_bandwidth ADD COLUMN IF NOT EXISTS sampled_at TIMESTAMP NOT NULL DEFAULT NOW()`).catch(() => {});
    await _pool.query(`ALTER TABLE fortigate_bandwidth ADD COLUMN IF NOT EXISTS tx_kbps TEXT NOT NULL DEFAULT '0'`).catch(() => {});
    await _pool.query(`ALTER TABLE fortigate_bandwidth ADD COLUMN IF NOT EXISTS rx_kbps TEXT NOT NULL DEFAULT '0'`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS fortigate_interface_status (
      id SERIAL PRIMARY KEY,
      interface_name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      is_up BOOLEAN NOT NULL DEFAULT FALSE,
      tx_kbps TEXT NOT NULL DEFAULT '0',
      rx_kbps TEXT NOT NULL DEFAULT '0',
      low_bandwidth_since TIMESTAMP,
      last_checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_error TEXT
    )`).catch(() => {});
    // Historical network monitoring and report tables. The standalone SQL
    // migration contains the same idempotent statements for on-prem installs.
    await _pool.query(`CREATE TABLE IF NOT EXISTS it_host_checks (
      id SERIAL PRIMARY KEY, host_id INTEGER NOT NULL REFERENCES it_monitored_hosts(id) ON DELETE CASCADE,
      is_online BOOLEAN NOT NULL, response_time_ms INTEGER, failure_reason TEXT,
      checked_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS it_network_issues (
      id SERIAL PRIMARY KEY, host_id INTEGER REFERENCES it_monitored_hosts(id) ON DELETE CASCADE,
      issue_type TEXT NOT NULL, title TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open', started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMP, assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      target_date DATE, investigation_notes TEXT, corrective_action TEXT,
      resolution_details TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS it_network_issue_updates (
      id SERIAL PRIMARY KEY, issue_id INTEGER NOT NULL REFERENCES it_network_issues(id) ON DELETE CASCADE,
      status TEXT, note TEXT, corrective_action TEXT, resolution_details TEXT,
      created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMP DEFAULT NOW()
    )`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS it_monitoring_settings (
      id SERIAL PRIMARY KEY, reports_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      report_day_of_week INTEGER NOT NULL DEFAULT 1, report_hour INTEGER NOT NULL DEFAULT 8,
      report_recipients TEXT[] NOT NULL DEFAULT '{}', email_reports BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT NOW()
    )`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS it_dashboard_settings (
      id SERIAL PRIMARY KEY,
      visible_sections TEXT NOT NULL DEFAULT '{"summary":true,"internetLinks":true,"fortigateLinks":true,"bandwidth":true,"devices":true,"kpis":true}',
      visible_metrics TEXT NOT NULL DEFAULT '{"onlineCounts":true,"historyAvailability":true,"packetLoss":true,"hostLatency":true,"hostLastChecked":true,"fortigateRates":true,"fortigateLastChecked":true,"fortigateUtilization":true,"lowBandwidth":true,"deviceOfflineList":true,"kpiMonthly":true}',
      selected_host_ids TEXT NOT NULL DEFAULT '[]',
      selected_interfaces TEXT NOT NULL DEFAULT '[]',
      interface_capacities TEXT NOT NULL DEFAULT '{}',
      chart_style TEXT NOT NULL DEFAULT 'line',
      updated_at TIMESTAMP DEFAULT NOW()
    )`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS it_monitoring_reports (
      id SERIAL PRIMARY KEY, week_start DATE NOT NULL UNIQUE, week_end DATE NOT NULL,
      report_json JSONB NOT NULL, generated_at TIMESTAMP NOT NULL DEFAULT NOW(), emailed_at TIMESTAMP
    )`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS it_monthly_network_reports (
      id SERIAL PRIMARY KEY, month_key DATE NOT NULL UNIQUE,
      report_json JSONB NOT NULL, generated_at TIMESTAMP NOT NULL DEFAULT NOW(), emailed_at TIMESTAMP
    )`).catch(() => {});
    await _pool.query(`CREATE INDEX IF NOT EXISTS it_host_checks_host_checked_idx ON it_host_checks(host_id, checked_at DESC)`).catch(() => {});
    await _pool.query(`CREATE INDEX IF NOT EXISTS it_host_checks_checked_idx ON it_host_checks(checked_at DESC)`).catch(() => {});
    await _pool.query(`CREATE INDEX IF NOT EXISTS it_network_issues_status_idx ON it_network_issues(status, started_at DESC)`).catch(() => {});
    await _pool.query(`CREATE INDEX IF NOT EXISTS it_network_issues_host_type_idx ON it_network_issues(host_id, issue_type, status)`).catch(() => {});
    await _pool.query(`CREATE INDEX IF NOT EXISTS it_network_issue_updates_issue_idx ON it_network_issue_updates(issue_id, created_at DESC)`).catch(() => {});
    await _pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS it_network_issues_open_dedupe_idx
      ON it_network_issues(host_id, issue_type) WHERE status <> 'resolved' AND host_id IS NOT NULL`).catch(() => {});
    await _pool.query(`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'smtp'`).catch(() => {});
    await _pool.query(`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS graph_tenant_id TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS graph_client_id TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS graph_client_secret TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type_label TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ownership_document_type TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ownership_expiry_date DATE`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_number TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_imported_status TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ivm_number TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ivm_payment_terms TEXT`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ivm_expiry_date DATE`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ivm_imported_status TEXT`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS vehicle_compliance_imports (
      id SERIAL PRIMARY KEY, actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_name TEXT NOT NULL, source_filename TEXT NOT NULL, options JSONB NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW(), undo_at TIMESTAMP,
      undo_actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL, undo_actor_name TEXT, undo_status TEXT
    )`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS vehicle_compliance_import_rows (
      id SERIAL PRIMARY KEY, import_id INTEGER NOT NULL REFERENCES vehicle_compliance_imports(id) ON DELETE CASCADE,
      row_number INTEGER NOT NULL, vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
      audited_vehicle_id INTEGER, action TEXT NOT NULL, before_values JSONB, after_values JSONB,
      changed_fields JSONB NOT NULL, success BOOLEAN NOT NULL DEFAULT TRUE, message TEXT,
      undo_status TEXT, undo_warning TEXT, undo_skipped_fields JSONB
    )`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS vehicle_compliance_import_undo_attempts (
      id SERIAL PRIMARY KEY,
      import_id INTEGER NOT NULL REFERENCES vehicle_compliance_imports(id) ON DELETE CASCADE,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_name TEXT NOT NULL,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'in_progress'
    )`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS vehicle_compliance_import_undo_attempt_rows (
      id SERIAL PRIMARY KEY,
      attempt_id INTEGER NOT NULL REFERENCES vehicle_compliance_import_undo_attempts(id) ON DELETE CASCADE,
      import_row_id INTEGER REFERENCES vehicle_compliance_import_rows(id) ON DELETE SET NULL,
      row_number INTEGER NOT NULL,
      attempted_fields JSONB NOT NULL,
      restored_fields JSONB NOT NULL,
      skipped_fields JSONB NOT NULL,
      status TEXT NOT NULL,
      warning TEXT
    )`).catch(() => {});
    for (const query of [
      `ALTER TABLE vehicle_compliance_imports ADD COLUMN IF NOT EXISTS undo_at TIMESTAMP`,
      `ALTER TABLE vehicle_compliance_imports ADD COLUMN IF NOT EXISTS undo_actor_id INTEGER`,
      `ALTER TABLE vehicle_compliance_imports ADD COLUMN IF NOT EXISTS undo_actor_name TEXT`,
      `ALTER TABLE vehicle_compliance_imports ADD COLUMN IF NOT EXISTS undo_status TEXT`,
      `ALTER TABLE vehicle_compliance_import_rows ADD COLUMN IF NOT EXISTS audited_vehicle_id INTEGER`,
      `ALTER TABLE vehicle_compliance_import_rows ADD COLUMN IF NOT EXISTS undo_status TEXT`,
      `ALTER TABLE vehicle_compliance_import_rows ADD COLUMN IF NOT EXISTS undo_warning TEXT`,
      `ALTER TABLE vehicle_compliance_import_rows ADD COLUMN IF NOT EXISTS undo_skipped_fields JSONB`,
    ]) await _pool.query(query).catch(() => {});
    await _pool.query(`CREATE INDEX IF NOT EXISTS vehicle_compliance_import_rows_import_idx ON vehicle_compliance_import_rows(import_id)`).catch(() => {});
    await _pool.query(`CREATE INDEX IF NOT EXISTS vehicle_compliance_import_undo_attempts_import_idx ON vehicle_compliance_import_undo_attempts(import_id)`).catch(() => {});
    await _pool.query(`CREATE INDEX IF NOT EXISTS vehicle_compliance_import_undo_attempt_rows_attempt_idx ON vehicle_compliance_import_undo_attempt_rows(attempt_id)`).catch(() => {});
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS email_delivery_health (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        warning_since TIMESTAMP,
        last_failure_at TIMESTAMP,
        last_success_at TIMESTAMP,
        last_error TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS trackers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        department_id INTEGER REFERENCES departments(id),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS tracker_items (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        serial_number TEXT,
        location TEXT,
        quantity INTEGER DEFAULT 1,
        purchase_date DATE,
        expiry_date DATE,
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS tracker_notification_rules (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
        trigger_type TEXT NOT NULL,
        threshold_days INTEGER,
        recipients TEXT[] NOT NULL DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_run_at TIMESTAMP,
        last_match_count INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add breakdown alert recipients to factory_machines if not present
    await _pool.query(`ALTER TABLE factory_machines ADD COLUMN IF NOT EXISTS breakdown_alert_recipients TEXT[] NOT NULL DEFAULT '{}'`).catch(() => {});
    // Add report access mode to factory_machines if not present (public | login_required | disabled)
    await _pool.query(`ALTER TABLE factory_machines ADD COLUMN IF NOT EXISTS report_access_mode TEXT NOT NULL DEFAULT 'public'`).catch(() => {});
    // User assignment lists need an explicit active flag. Existing installations
    // receive the same default as newly-created users.
    await _pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS user_status_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      changed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      changed_by_name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL,
      changed_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`).catch(() => {});
    await _pool.query(`CREATE INDEX IF NOT EXISTS user_status_history_user_changed_at_idx
      ON user_status_history(user_id, changed_at DESC)`).catch(() => {});
    // License expiry monitoring columns and tables are created here as well as in the
    // on-prem migration so existing installations can start safely after an upgrade.
    await _pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS license_expiry_date DATE`).catch(() => {});
    await _pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_expiry_date DATE`).catch(() => {});
    await _pool.query(`CREATE TABLE IF NOT EXISTS company_documents (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, document_type TEXT, expiry_date DATE NOT NULL,
      notes TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW()
    )`);
    await _pool.query(`CREATE TABLE IF NOT EXISTS company_document_access (
      id SERIAL PRIMARY KEY, company_document_id INTEGER NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(company_document_id, user_id)
    )`);
    await _pool.query(`CREATE TABLE IF NOT EXISTS expiry_notification_rules (
      id SERIAL PRIMARY KEY, entity_type TEXT NOT NULL, trigger_type TEXT NOT NULL, threshold_days INTEGER,
      send_email BOOLEAN NOT NULL DEFAULT TRUE, send_in_app BOOLEAN NOT NULL DEFAULT TRUE,
      preferred_time TEXT NOT NULL DEFAULT '09:00', schedule_timezone TEXT NOT NULL DEFAULT 'Africa/Lagos',
      times_per_day INTEGER NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW()
    )`);
    await _pool.query(`ALTER TABLE expiry_notification_rules ADD COLUMN IF NOT EXISTS preferred_time TEXT NOT NULL DEFAULT '09:00'`);
    await _pool.query(`ALTER TABLE expiry_notification_rules ADD COLUMN IF NOT EXISTS schedule_timezone TEXT NOT NULL DEFAULT 'Africa/Lagos'`);
    await _pool.query(`ALTER TABLE expiry_notification_rules ADD COLUMN IF NOT EXISTS times_per_day INTEGER NOT NULL DEFAULT 1`);
    await _pool.query(`CREATE TABLE IF NOT EXISTS expiry_notification_recipients (
      id SERIAL PRIMARY KEY, rule_id INTEGER NOT NULL REFERENCES expiry_notification_rules(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, email TEXT,
      CHECK (user_id IS NOT NULL OR email IS NOT NULL)
    )`);
    await _pool.query(`CREATE TABLE IF NOT EXISTS expiry_notifications (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rule_id INTEGER REFERENCES expiry_notification_rules(id) ON DELETE SET NULL,
      entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL, entity_name TEXT NOT NULL, expiry_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMP DEFAULT NOW(),
      acknowledged_at TIMESTAMP, resolved_at TIMESTAMP
    )`);
    await _pool.query(`CREATE TABLE IF NOT EXISTS expiry_notification_deliveries (
      id SERIAL PRIMARY KEY, rule_id INTEGER NOT NULL REFERENCES expiry_notification_rules(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL, recipient_key TEXT NOT NULL, channel TEXT NOT NULL,
      delivery_date DATE NOT NULL, delivery_occurrence INTEGER NOT NULL DEFAULT 0,
      success BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(rule_id, entity_type, entity_id, recipient_key, channel, delivery_date, delivery_occurrence)
    )`);
    await _pool.query(`ALTER TABLE expiry_notification_deliveries ADD COLUMN IF NOT EXISTS delivery_occurrence INTEGER NOT NULL DEFAULT 0`);
    await _pool.query(`CREATE TABLE IF NOT EXISTS expiry_notification_delivery_attempts (
      id SERIAL PRIMARY KEY,
      rule_id INTEGER NOT NULL REFERENCES expiry_notification_rules(id) ON DELETE CASCADE,
      delivery_type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'email',
      success BOOLEAN NOT NULL,
      error TEXT,
      attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    await _pool.query(`CREATE INDEX IF NOT EXISTS expiry_notification_delivery_attempts_rule_time_idx
      ON expiry_notification_delivery_attempts(rule_id, attempted_at DESC)`);
    await _pool.query(`DO $$
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
      END $$`);
    await _pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS expiry_notification_delivery_occurrence_unique
      ON expiry_notification_deliveries(rule_id, entity_type, entity_id, recipient_key, channel, delivery_date, delivery_occurrence)`);
    await _pool.query(`CREATE INDEX IF NOT EXISTS expiry_notifications_user_status_idx
      ON expiry_notifications(user_id, status, created_at DESC)`);
  } catch (err: any) {
    console.warn('[db] Auto-migration warning:', err.message);
  }

  return { pool: _pool, db: _db };
}

export function getPool() {
  if (!_pool) throw new Error('Database not initialized. Call initDatabase() first.');
  return _pool;
}

export function getDb() {
  if (!_db) throw new Error('Database not initialized. Call initDatabase() first.');
  return _db;
}

export { schema };
