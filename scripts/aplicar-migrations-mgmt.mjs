/**
 * Aplica migrations SQL no banco via Supabase Management API.
 * Uso: node scripts/aplicar-migrations-mgmt.mjs <arquivo1> <arquivo2> ...
 * Envia cada arquivo inteiro como uma query SQL (equivalente ao SQL Editor).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.argv.find((a) => a.startsWith('sbp_'));
const PROJECT_REF = 'dbukdhycfaibdshxnatt';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

if (!TOKEN || TOKEN.startsWith('sbp_') === false) {
  console.error('❌ Token sbp_ não fornecido.');
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('❌ Nenhum arquivo SQL informado.');
  process.exit(1);
}

let failed = 0;

for (const f of files) {
  const path = resolve(f);
  if (!existsSync(path)) {
    console.error(`❌ Arquivo não encontrado: ${f}`);
    failed++;
    continue;
  }
  const sql = readFileSync(path, 'utf8');
  console.log(`\n▶ Aplicando: ${f} (${sql.length} chars)...`);

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    const text = await res.text();
    if (res.ok) {
      console.log(`  ✅ OK (${text.slice(0, 80) || 'sem retorno'})`);
    } else {
      failed++;
      console.error(`  ❌ HTTP ${res.status}: ${text.slice(0, 400)}`);
    }
  } catch (e) {
    failed++;
    console.error(`  ❌ Exceção: ${e.message}`);
  }
}

console.log(`\n${failed === 0 ? '✅ Todas as migrations aplicadas!' : `❌ ${failed} arquivo(s) com erro.`}\n`);
process.exit(failed > 0 ? 1 : 0);
