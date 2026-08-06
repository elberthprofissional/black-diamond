/**
 * regenerate-mega.mjs
 * Regenera scripts/_RODAR_NO_SQL_EDITOR.sql a partir dos 5 arquivos
 * consolidados finais em supabase/migrations/. Este é o arquivo único
 * para colar no SQL Editor do Supabase.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const FILES = [
  '001_schema_rls.sql',
  '002_functions_triggers.sql',
  '003_features_fixes.sql',
  '004_subscriptions_pix.sql',
  '005_performance_auditoria.sql',
  '006_rls_estricto.sql',
];

const header = `-- =========================================================================
-- BLACK DIAMOND — TODAS AS MIGRATIONS (001 → 006)
-- =========================================================================
-- Arquivo gerado por scripts/regenerate-mega.mjs a partir de
-- supabase/migrations/*.sql. Cole TUDO no SQL Editor do Supabase
-- e execute em ordem (o arquivo já está na ordem correta).
-- =========================================================================

`;

let out = header;
for (const f of FILES) {
  const content = readFileSync(resolve(ROOT, 'supabase/migrations', f), 'utf8');
  out += `\n-- >>> MIGRATION: ${f} <<<\n\n`;
  out += content.trimEnd() + '\n';
}

writeFileSync(resolve(ROOT, 'scripts/_RODAR_NO_SQL_EDITOR.sql'), out);
console.log(`✅ _RODAR_NO_SQL_EDITOR.sql regenerado (${out.split('\n').length} linhas)`);
