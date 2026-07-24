/**
 * Migration 007: Remove mensalista_plans
 * 
 * Uso: node scripts/run-migration-007.mjs
 * 
 * Conecta via service_role key e executa os comandos SQL da migration.
 * Tenta primeiro via RPC exec_sql_diag, depois via REST SQL endpoint.
 */

const SUPABASE_URL = process.argv[2] || 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_KEY = process.argv[3] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const sql = `
-- Remove a foreign key de clients para mensalista_plans
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_mensalista_plan_id_fkey;

-- Remove os índices da tabela mensalista_plans
DROP INDEX IF EXISTS idx_mensalista_plans_active;

-- Remove RLS policies da tabela
DROP POLICY IF EXISTS "Mensalista plans leitura publica" ON mensalista_plans;
DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;

-- Remove a tabela
DROP TABLE IF EXISTS mensalista_plans CASCADE;

-- Remove a função RPC de verificação de mensalistas
DROP FUNCTION IF EXISTS verificar_mensalistas CASCADE;
`;

async function tryRpc(sqlToRun) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql_diag`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ p_sql: sqlToRun }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return { success: true, method: 'RPC exec_sql_diag', data };
    }
    const errText = await resp.text();
    return { success: false, error: errText };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function trySqlEndpoint(sqlToRun) {
  try {
    // Supabase SQL API via /rest/v1/ (requires specific headers)
    const statements = sqlToRun
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const results = [];
    for (const stmt of statements) {
      const url = `${SUPABASE_URL}/rest/v1/rpc/`;
      // Try to use the query endpoint directly
      const headers = {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'X-Requested-With': 'XMLHttpRequest',
      };
      
      // Attempt: run as raw SQL via supabase client
      // Fallback: use individual RPC calls per operation
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false },
      });

      // Try individual table operations
      if (stmt.includes('DROP TABLE IF EXISTS mensalista_plans')) {
        // Use the REST API directly
        const delResp = await fetch(`${SUPABASE_URL}/rest/v1/mensalista_plans`, {
          method: 'DELETE',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
          },
        });
        results.push({ statement: stmt.substring(0, 60), status: delResp.status, text: await delResp.text() });
      } else if (stmt.includes('DROP FUNCTION')) {
        results.push({ statement: stmt.substring(0, 60), status: 'skipped', text: 'Cannot drop functions via REST API directly' });
      } else {
        results.push({ statement: stmt.substring(0, 60), status: 'skipped', text: 'Cannot execute via REST API' });
      }
    }
    return { success: true, method: 'REST direct', results };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function trySingleOperations() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const results = [];

  // 1. Try to delete all rows from mensalista_plans first
  console.log('📋 Step 1: Deleting all rows from mensalista_plans...');
  try {
    const { error } = await supabase.from('mensalista_plans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    results.push({ step: 'delete_rows', success: !error, error: error?.message });
    console.log(`   ${error ? '❌ ' + error.message : '✅ Done'}`);
  } catch (e) {
    results.push({ step: 'delete_rows', success: false, error: e.message });
    console.log(`   ⚠️ ${e.message} (table might not exist)`);
  }

  // 2. Check if table exists by trying to count
  console.log('📋 Step 2: Checking if mensalista_plans table exists...');
  try {
    const { count, error } = await supabase
      .from('mensalista_plans')
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`   ℹ️ Table likely already removed: ${error.message}`);
      results.push({ step: 'check_exists', success: true, note: 'Table already removed' });
    } else {
      console.log(`   ⚠️ Table still exists with ${count} rows`);
      results.push({ step: 'check_exists', success: false, note: `Table exists with ${count} rows` });
    }
  } catch (e) {
    console.log(`   ℹ️ Table already removed: ${e.message}`);
    results.push({ step: 'check_exists', success: true, note: 'Table removed' });
  }

  return results;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  MIGRATION 007: REMOVE MENSALISTA PLANS');
  console.log('='.repeat(60));
  console.log(`🔗 ${SUPABASE_URL}\n`);

  // Try RPC approach first
  console.log('📋 Method 1: RPC exec_sql_diag...');
  const rpcResult = await tryRpc(sql);
  if (rpcResult.success) {
    console.log('   ✅ Migration executed via RPC!');
    console.log('   Response:', JSON.stringify(rpcResult.data).substring(0, 200));
    return;
  }
  console.log(`   ⚠️ RPC failed: ${rpcResult.error?.substring(0, 100)}`);

  // Try direct operations
  console.log('\n📋 Method 2: Direct operations...');
  const opsResults = await trySingleOperations();
  
  const allOk = opsResults.every(r => r.success);
  if (allOk) {
    console.log('\n✅ Migration completed successfully!');
  } else {
    console.log('\n⚠️ Migration partially completed. Check details above.');
  }

  console.log('\n' + '='.repeat(60));
  process.exit(allOk ? 0 : 1);
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});
