// Applique un fichier SQL sur une base Postgres (Supabase) sans psql.
// Usage : node tools/apply_schema.mjs <DB_URL> <fichier.sql>
import pg from 'pg';
import { readFileSync } from 'fs';

const url = process.argv[2];
const file = process.argv[3];
if (!url || !file) { console.error('Usage: node apply_schema.mjs <DB_URL> <fichier.sql>'); process.exit(1); }

const sql = readFileSync(file, 'utf8');
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query(sql);
  console.error('✅ Schéma appliqué avec succès.');
} catch (e) {
  console.error('❌ Erreur lors de l\'application :');
  console.error('   ' + e.message);
  if (e.position) {
    const ctx = sql.slice(Math.max(0, e.position - 120), e.position + 120);
    console.error('   --- contexte ---\n' + ctx);
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
