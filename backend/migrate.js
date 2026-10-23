// Runs every SQL file in /supabase against your database, in order.
// Usage (from /backend):  npm run migrate
// Needs SUPABASE_DB_URL in backend/.env (Supabase -> Connect -> Session pooler URI).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url || url.includes('[YOUR-PASSWORD]')) {
    console.error('Set SUPABASE_DB_URL in backend/.env with your real database password first.');
    process.exit(1);
  }
  const dir = path.join(__dirname, '..', 'supabase');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const file of files) {
      console.log(`Running ${file} ...`);
      await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
    }
    console.log('Done.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
