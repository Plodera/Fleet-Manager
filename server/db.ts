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
        id                    SERIAL PRIMARY KEY,
        host                  TEXT NOT NULL DEFAULT '',
        api_token             TEXT NOT NULL DEFAULT '',
        poll_interval_seconds INTEGER NOT NULL DEFAULT 60,
        enabled               BOOLEAN NOT NULL DEFAULT FALSE,
        interfaces            TEXT NOT NULL DEFAULT '',
        last_sync_at          TIMESTAMP,
        last_error            TEXT,
        updated_at            TIMESTAMP DEFAULT NOW()
      )
    `);
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS fortigate_bandwidth (
        id             SERIAL PRIMARY KEY,
        recorded_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        interface_name TEXT NOT NULL,
        tx_mbps        TEXT NOT NULL DEFAULT '0',
        rx_mbps        TEXT NOT NULL DEFAULT '0'
      )
    `);
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
