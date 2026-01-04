import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use standard pg driver for local/Windows deployment, Neon serverless for cloud
const isLocalDeployment = process.env.DATABASE_URL?.includes('localhost') || 
                          process.env.DATABASE_URL?.includes('127.0.0.1') ||
                          process.env.USE_LOCAL_DB === 'true';

let pool: any;
let db: any;

if (isLocalDeployment) {
  // Use standard PostgreSQL driver for local deployment
  const pg = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // Use Neon serverless driver for cloud deployment
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const ws = await import('ws');
  neonConfig.webSocketConstructor = ws.default;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { pool, db };
