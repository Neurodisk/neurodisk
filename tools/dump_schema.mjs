// Dump complet du schéma "public" (+ trigger auth.users) d'un projet Supabase
// sans pg_dump/Docker. Usage : node tools/dump_schema.mjs <DB_URL> > out.sql
import pg from 'pg';

const url = process.argv[2];
if (!url) { console.error('Usage: node dump_schema.mjs <DB_URL>'); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const out = [];
const W = (s) => out.push(s);

await client.connect();

W('-- Schéma exporté automatiquement (structure seule, pas de données)\n');
W('SET statement_timeout = 0;\nSET client_min_messages = warning;\n');

// 1) ENUMs
const enums = await client.query(`
  SELECT t.typname,
         string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS labels
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname='public'
  GROUP BY t.typname`);
if (enums.rows.length) W('\n-- ===== Types énumérés =====');
for (const r of enums.rows)
  W(`DO $$ BEGIN CREATE TYPE public.${r.typname} AS ENUM (${r.labels}); EXCEPTION WHEN duplicate_object THEN null; END $$;`);

// 2) TABLES (colonnes uniquement, contraintes ajoutées après)
const tables = await client.query(`
  SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`);
W('\n-- ===== Tables =====');
for (const t of tables.rows) {
  const cols = await client.query(`
    SELECT a.attname,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
           a.attnotnull,
           pg_get_expr(d.adbin, d.adrelid) AS def
    FROM pg_attribute a
    JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relname=$1 AND a.attnum>0 AND NOT a.attisdropped
    ORDER BY a.attnum`, [t.relname]);
  const defs = cols.rows.map(col => {
    let line = `  ${col.attname} ${col.type}`;
    if (col.def) line += ` DEFAULT ${col.def}`;
    if (col.attnotnull) line += ' NOT NULL';
    return line;
  });
  W(`\nCREATE TABLE IF NOT EXISTS public.${t.relname} (\n${defs.join(',\n')}\n);`);
}

// 3) CONTRAINTES — PK/UNIQUE/CHECK d'abord, FK ensuite
const cons = await client.query(`
  SELECT c.relname AS tbl, con.conname, pg_get_constraintdef(con.oid) AS def, con.contype
  FROM pg_constraint con
  JOIN pg_class c ON c.oid=con.conrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
  ORDER BY CASE con.contype WHEN 'p' THEN 0 WHEN 'u' THEN 1 WHEN 'c' THEN 2 ELSE 3 END`);
W('\n-- ===== Contraintes =====');
for (const c of cons.rows)
  W(`ALTER TABLE public.${c.tbl} ADD CONSTRAINT ${c.conname} ${c.def};`);

// 4) INDEX (hors PK/uniques portés par une contrainte)
const idx = await client.query(`
  SELECT pg_get_indexdef(c.oid) AS def
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_index ix ON ix.indexrelid=c.oid
  WHERE n.nspname='public' AND c.relkind='i' AND NOT ix.indisprimary
    AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conindid=c.oid)`);
if (idx.rows.length) W('\n-- ===== Index =====');
for (const i of idx.rows) W(`${i.def};`);

// 5) FONCTIONS (inclut les RPC SECURITY DEFINER du chat)
const fns = await client.query(`
  SELECT pg_get_functiondef(p.oid) AS def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prokind='f'`);
W('\n-- ===== Fonctions =====');
for (const f of fns.rows) W(`${f.def};`);

// 6) TRIGGERS (public + auth.users)
const trg = await client.query(`
  SELECT pg_get_triggerdef(tg.oid) AS def
  FROM pg_trigger tg
  JOIN pg_class c ON c.oid=tg.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE NOT tg.tgisinternal
    AND (n.nspname='public' OR (n.nspname='auth' AND c.relname='users'))`);
if (trg.rows.length) W('\n-- ===== Triggers =====');
for (const t of trg.rows) W(`${t.def};`);

// 7) RLS + POLICIES
const rlsTables = await client.query(`
  SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity`);
W('\n-- ===== RLS =====');
for (const t of rlsTables.rows)
  W(`ALTER TABLE public.${t.relname} ENABLE ROW LEVEL SECURITY;`);

const pols = await client.query(`
  SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies WHERE schemaname='public'`);
W('\n-- ===== Policies =====');
for (const p of pols.rows) {
  let s = `CREATE POLICY "${p.policyname}" ON public.${p.tablename}`;
  s += ` AS ${p.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE'}`;
  s += ` FOR ${p.cmd}`;
  const roles = Array.isArray(p.roles) ? p.roles : String(p.roles).replace(/^{|}$/g, '').split(',');
  s += ` TO ${roles.join(', ')}`;
  if (p.qual != null) s += ` USING (${p.qual})`;
  if (p.with_check != null) s += ` WITH CHECK (${p.with_check})`;
  W(`${s};`);
}

// 8) GRANTS pour les rôles de l'API Data (anon / authenticated / service_role)
const grants = await client.query(`
  SELECT grantee, table_name, string_agg(privilege_type, ', ') AS privs
  FROM information_schema.role_table_grants
  WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role')
  GROUP BY grantee, table_name
  ORDER BY table_name, grantee`);
W('\n-- ===== Grants (API Data) =====');
for (const g of grants.rows)
  W(`GRANT ${g.privs} ON public.${g.table_name} TO ${g.grantee};`);

// EXECUTE sur toutes les fonctions publiques (couvre les RPC du chat)
W(`\nGRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;`);

await client.end();
process.stdout.write(out.join('\n') + '\n');
console.error(`OK : ${tables.rows.length} tables, ${fns.rows.length} fonctions, ${pols.rows.length} policies, ${trg.rows.length} triggers, ${grants.rows.length} grants.`);
