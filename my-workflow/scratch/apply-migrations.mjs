/**
 * Apply pending Supabase migrations (003, 004, 005) via Management API.
 * Run with: node scratch/apply-migrations.mjs YOUR_PERSONAL_ACCESS_TOKEN
 *
 * Get a personal access token from: https://supabase.com/dashboard/account/tokens
 * It must be of the form sbp_xxxx...
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'pvivrzsedhoolfbsereb';
const TOKEN = process.argv[2];

if (!TOKEN || !TOKEN.startsWith('sbp_')) {
  console.error('Usage: node scratch/apply-migrations.mjs sbp_YOUR_PERSONAL_ACCESS_TOKEN');
  console.error('Get one from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const sqlFile = join(__dirname, '../supabase/migrations/run_pending_migrations.sql');
const sql = readFileSync(sqlFile, 'utf-8');

console.log(`Applying migrations to project: ${PROJECT_REF}`);
console.log(`SQL file size: ${sql.length} chars`);

const response = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
);

const text = await response.text();
console.log(`Status: ${response.status}`);

if (!response.ok) {
  console.error('Error response:', text);
  process.exit(1);
}

console.log('SUCCESS! Migrations applied.');
console.log(text);
