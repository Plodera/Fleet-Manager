import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect local database by checking if DATABASE_URL points to localhost
const isLocalDb = process.env.DB_DRIVER === 'pg' || 
                  process.env.DATABASE_URL?.includes('localhost') || 
                  process.env.DATABASE_URL?.includes('127.0.0.1');

let pool: any;
let db: any;

if (isLocalDb) {
  // Use standard pg driver for local/Windows deployment
  const pg = await import('pg');
  const { drizzle: drizzleNodePg } = await import('drizzle-orm/node-postgres');
  pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNodePg(pool, { schema });
  console.log('Database: Using local PostgreSQL driver');
} else {
  // Use Neon serverless driver for cloud deployment
  const { Pool: NeonPool, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle: drizzleNeon } = await import('drizzle-orm/neon-serverless');
  const ws = await import('ws');
  neonConfig.webSocketConstructor = ws.default;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool, schema });
  console.log('Database: Using Neon serverless driver');
}

export { pool, db };
