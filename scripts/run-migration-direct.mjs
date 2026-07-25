/**
 * Migration: Executa o SQL da migration 007 diretamente via REST API
 * Usa a service_role key para bypass RLS
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

// Common headers for all requests
const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Accept': 'application/json',
};

async function callRpc(rpcName, params) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${rpcName}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, data: text };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  MENSALISTA REBORN - EXECUCAO DIRETA');
  console.log('='.repeat(60));

  // Step 1: Try multiple RPC names for exec_sql
  console.log('\n📋 Step 1: Testing available RPC functions...');
  
  const rpcNames = ['exec_sql', 'exec_sql_diag', 'execute_sql'];
  let workingRpc = null;
  let workingParam = null;
  
  for (const name of rpcNames) {
    for (const paramName of ['sql_text', 'p_sql', 'query', 'sql']) {
      const params = {};
      params[paramName] = 'SELECT 1 AS test';
      const result = await callRpc(name, params);
      if (result.ok) {
        console.log(`   ✅ Found: ${name}(${paramName})`);
        workingRpc = name;
        workingParam = paramName;
        break;
      }
    }
    if (workingRpc) break;
  }

  if (!workingRpc) {
    console.log('\n❌ No exec_sql RPC function found.');
    console.log('   Trying alternative approach: running statements via REST API...\n');
    
    // Try direct REST API operations
    await runViaRestApi();
    return;
  }

  // Step 2: Execute the migration SQL
  console.log(`\n📋 Step 2: Executing migration via ${workingRpc}...`);
  
  const migrationPath = resolve(__dirname, '..', 'supabase', 'migrations', '007_mensalista_reborn.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  
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
    console.log(`\n   [${i + 1}/${statements.length}] ${preview}...`);
    
    const params = {};
    params[workingParam] = stmt + ';';
    
    const result = await callRpc(workingRpc, params);
    if (result.ok) {
      console.log(`   ✅ OK`);
      success++;
    } else {
      console.log(`   ⚠️  Status ${result.status}: ${result.data.substring(0, 100)}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${success} succeeded, ${failed} failed`);
}

async function runViaRestApi() {
  console.log('📋 Attempting direct table operations...');
  
  // Check if table already exists
  const checkResp = await fetch(`${SUPABASE_URL}/rest/v1/mensalista_plans?select=id&limit=1`, { headers });
  if (checkResp.ok || checkResp.status === 200) {
    console.log('   ✅ mensalista_plans table already exists!');
    return;
  }
  
  console.log('\n❌ Cannot execute DDL (CREATE TABLE) via REST API.');
  console.log('\n⚠️  Para aplicar a migration, use o SQL Editor do Supabase:');
  console.log('   1. Acesse: https://supabase.com/dashboard/project/dbukdhycfaibdshxnatt/sql/new');
  console.log('   2. Copie o conteúdo de: supabase/migrations/007_mensalista_reborn.sql');
  console.log('   3. Cole e clique em "Run"');
  console.log('\n   Ou execute via terminal com psql (se tiver a senha do banco):');
  console.log('   psql "postgresql://postgres:[SENHA]@db.dbukdhycfaibdshxnatt.supabase.co:5432/postgres" -f supabase/migrations/007_mensalista_reborn.sql');
}

main().catch(console.error);
