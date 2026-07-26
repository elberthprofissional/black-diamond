/**
 * Migration 012: Executa o SQL de assinatura mensal no banco.
 * Tenta diversas RPCs, e se falhar, mostra comando psql.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
};

async function main() {
  console.log('='.repeat(60));
  console.log('  MIGRATION 012 - ASSINATURA MENSAL');
  console.log('='.repeat(60));

  const migrationPath = resolve(__dirname, '..', 'supabase', 'migrations', '012_monthly_subscriptions.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // RPC names to try
  const rpcNames = ['exec_sql', 'exec_sql_diag', 'execute_sql'];
  const paramNames = ['sql_text', 'p_sql', 'query', 'sql_text_diag'];

  let workingRpc = null;
  let workingParam = null;

  console.log('\n📋 Procurando RPC para executar SQL...');

  for (const name of rpcNames) {
    for (const param of paramNames) {
      const params = {};
      params[param] = 'SELECT 1 AS test';
      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (resp.ok) {
          workingRpc = name;
          workingParam = param;
          console.log(`   ✅ Found: ${name}(${param})`);
          break;
        }
      } catch {}
    }
    if (workingRpc) break;
  }

  if (workingRpc) {
    console.log(`\n📋 Executando migration via ${workingRpc}...`);

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== '');

    let success = 0;
    let failed = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 80).replace(/\n/g, ' ').trim();
      console.log(`   [${i + 1}/${statements.length}] ${preview}...`);

      const params = {};
      params[workingParam] = stmt + ';';
      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${workingRpc}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (resp.ok) {
          console.log(`   ✅ OK`);
          success++;
        } else {
          const text = await resp.text();
          console.log(`   ⚠️  ${resp.status}: ${text.substring(0, 120)}`);
          failed++;
        }
      } catch (e) {
        console.log(`   ❌ ${e.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Resultado: ${success} ok, ${failed} falhas`);
  } else {
    console.log('\n❌ Nenhum RPC de execução SQL encontrado.');
    console.log('\n⚠️  Pra aplicar a migration, faça:\n');
    console.log('   1. Acesse o SQL Editor do Supabase:');
    console.log('   https://supabase.com/dashboard/project/dbukdhycfaibdshxnatt/sql/new\n');
    console.log('   2. Copie o conteúdo de:');
    console.log(`   ${migrationPath}\n`);
    console.log('   3. Cole no SQL Editor e clique em "Run"\n');
    console.log('   Ou via terminal (se tiver a senha do banco):');
    console.log('   psql "postgresql://postgres:[SENHA]@db.dbukdhycfaibdshxnatt.supabase.co:5432/postgres" -f ' + migrationPath);
  }
}

main().catch(console.error);
