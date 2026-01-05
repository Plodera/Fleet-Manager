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
