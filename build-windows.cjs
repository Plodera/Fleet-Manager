const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building FleetCmD for Windows Server...');

// Step 1: Build the client
console.log('Building client...');
execSync('npx vite build --outDir dist/public', { stdio: 'inherit' });

// Step 2: Create a modified db.ts for local PostgreSQL
const dbContent = `
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
`;

// Step 3: Bundle server with esbuild using the patched db
console.log('Building server...');
const esbuild = require('esbuild');

// First, write a temporary patched db file
fs.writeFileSync('server/db-patched.ts', dbContent);

// Read storage.ts and create patched version
let storageContent = fs.readFileSync('server/storage.ts', 'utf8');
storageContent = storageContent.replace('./db', './db-patched');
fs.writeFileSync('server/storage-patched.ts', storageContent);

// Read routes.ts and create patched version
let routesContent = fs.readFileSync('server/routes.ts', 'utf8');
routesContent = routesContent.replace('./storage', './storage-patched');
fs.writeFileSync('server/routes-patched.ts', routesContent);

// Read index.ts and create patched version  
let indexContent = fs.readFileSync('server/index.ts', 'utf8');
indexContent = indexContent.replace('./routes', './routes-patched');
// Remove vite import for production
indexContent = indexContent.replace(/if \(process\.env\.NODE_ENV === "production"\) \{[\s\S]*?\} else \{[\s\S]*?\}/m, 
  'serveStatic(app);');
fs.writeFileSync('server/index-patched.ts', indexContent);

esbuild.buildSync({
  entryPoints: ['server/index-patched.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.cjs',
  format: 'cjs',
  external: ['pg-native'],
});

// Cleanup temp files
fs.unlinkSync('server/db-patched.ts');
fs.unlinkSync('server/storage-patched.ts');
fs.unlinkSync('server/routes-patched.ts');
fs.unlinkSync('server/index-patched.ts');

console.log('');
console.log('Build complete!');
console.log('');
console.log('To start the application:');
console.log('  node dist/index.cjs');
