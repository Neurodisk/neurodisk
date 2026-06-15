// Copie les fichiers Storage d'un projet Supabase vers un autre.
// Usage : node tools/copy_storage.mjs <SRC_DB_URL> <OLD_BASE> <NEW_BASE> <NEW_SECRET_KEY>
import pg from 'pg';

const [,, SRC_DB, OLD_BASE, NEW_BASE, NEW_KEY] = process.argv;
if (!SRC_DB || !OLD_BASE || !NEW_BASE || !NEW_KEY) {
  console.error('Usage: node copy_storage.mjs <SRC_DB_URL> <OLD_BASE> <NEW_BASE> <NEW_SECRET_KEY>');
  process.exit(1);
}

const src = new pg.Client({ connectionString: SRC_DB, ssl: { rejectUnauthorized: false } });
await src.connect();
const objs = (await src.query(
  `SELECT bucket_id, name FROM storage.objects ORDER BY bucket_id, name`)).rows;
await src.end();

let ok = 0, fail = 0;
for (const { bucket_id, name } of objs) {
  const enc = name.split('/').map(encodeURIComponent).join('/');
  const dlUrl = `${OLD_BASE}/storage/v1/object/public/${encodeURIComponent(bucket_id)}/${enc}`;
  const upUrl = `${NEW_BASE}/storage/v1/object/${encodeURIComponent(bucket_id)}/${enc}`;
  try {
    const dl = await fetch(dlUrl);
    if (!dl.ok) throw new Error(`download HTTP ${dl.status}`);
    const buf = Buffer.from(await dl.arrayBuffer());
    const ct = dl.headers.get('content-type') || 'application/octet-stream';
    const up = await fetch(upUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEW_KEY}`,
        'apikey': NEW_KEY,
        'Content-Type': ct,
        'x-upsert': 'true',
      },
      body: buf,
    });
    if (!up.ok) throw new Error(`upload HTTP ${up.status} ${(await up.text()).slice(0,120)}`);
    ok++;
    console.error(`  ✓ [${bucket_id}] ${name} (${buf.length} o)`);
  } catch (e) {
    fail++;
    console.error(`  ✗ [${bucket_id}] ${name} : ${e.message}`);
  }
}
console.error(`\n${ok} copiés, ${fail} échecs.`);
