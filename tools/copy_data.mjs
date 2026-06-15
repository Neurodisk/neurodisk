// Copie les DONNÉES (pas la structure) d'un projet Supabase vers un autre.
// Désactive triggers + contraintes FK le temps de la copie (session_replication_role=replica).
// Usage : node tools/copy_data.mjs <SRC_URL> <DEST_URL>
import pg from 'pg';

const [,, SRC, DEST] = process.argv;
if (!SRC || !DEST) { console.error('Usage: node copy_data.mjs <SRC_URL> <DEST_URL>'); process.exit(1); }

const src = new pg.Client({ connectionString: SRC, ssl: { rejectUnauthorized: false } });
const dst = new pg.Client({ connectionString: DEST, ssl: { rejectUnauthorized: false } });
await src.connect();
await dst.connect();

// Ordre : auth d'abord (les profiles publics référencent auth.users)
const authTables = [['auth', 'users'], ['auth', 'identities']];
const pubRes = await src.query(`
  SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`);
const tables = [...authTables, ...pubRes.rows.map(r => ['public', r.relname])];

await dst.query("SET session_replication_role = 'replica';");

let total = 0;
for (const [schema, table] of tables) {
  // colonnes communes (au cas où une colonne diffère)
  const colsRes = await dst.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema=$1 AND table_name=$2
       AND is_generated = 'NEVER' AND is_identity = 'NO'
     ORDER BY ordinal_position`, [schema, table]);
  const cols = colsRes.rows.map(r => r.column_name);
  if (!cols.length) { console.error(`  (skip ${schema}.${table} : table absente dest)`); continue; }
  const collist = cols.map(c => `"${c}"`).join(',');

  const rows = (await src.query(`SELECT ${collist} FROM ${schema}."${table}"`)).rows;
  if (!rows.length) { console.error(`  ${schema}.${table} : 0`); continue; }

  let inserted = 0;
  for (const row of rows) {
    const vals = cols.map(c => row[c]);
    const ph = cols.map((_, i) => `$${i + 1}`).join(',');
    try {
      const r = await dst.query(
        `INSERT INTO ${schema}."${table}" (${collist}) VALUES (${ph}) ON CONFLICT DO NOTHING`, vals);
      inserted += r.rowCount;
    } catch (e) {
      console.error(`  ! ${schema}.${table} ligne ignorée : ${e.message}`);
    }
  }
  total += inserted;
  console.error(`  ${schema}.${table} : ${inserted}/${rows.length}`);
}

await dst.query("SET session_replication_role = 'origin';");
await src.end();
await dst.end();
console.error(`\n✅ Copie terminée — ${total} lignes insérées.`);
