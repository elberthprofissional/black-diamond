/**
 * regenerate-mega.mjs
 * Regenera supabase/_RODAR_NO_SQL_EDITOR.sql a partir de todas as migrations
 * em supabase/migrations/*.sql em ordem numéica.
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MIGRATIONS_DIR = resolve(ROOT, 'supabase/migrations');

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const header = `-- =========================================================================
-- BLACK DIAMOND — TODAS AS MIGRATIONS CONSOLIDADAS (${files[0]} → ${files[files.length - 1]})
-- =========================================================================
-- Arquivo gerado por scripts/regenerate-mega.mjs a partir de
-- supabase/migrations/*.sql. Cole TUDO no SQL Editor do Supabase.
-- =========================================================================

`;

let out = header;
for (const f of files) {
  const content = readFileSync(resolve(MIGRATIONS_DIR, f), 'utf8');
  out += `\n-- >>> MIGRATION: ${f} <<<\n\n`;
  out += content.trimEnd() + '\n';
}

const outputPath = resolve(ROOT, 'supabase/_RODAR_NO_SQL_EDITOR.sql');
writeFileSync(outputPath, out);
console.log(`✅ supabase/_RODAR_NO_SQL_EDITOR.sql regenerado com ${files.length} migrations (${out.split('\n').length} linhas)`);
