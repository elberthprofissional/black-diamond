/**
 * Migration: Recreate mensalista_plans system
 * Tries multiple RPC methods to execute SQL
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dbukdhycfaibdshxnatt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Try multiple possible RPC function names
const RPC_NAMES = [
  'exec_sql_diag',
  'exec_sql', 
  'run_sql',
  'execute_sql',
  'query',
];

async function findWorkingRpc() {
  const testSql = 'SELECT 1 as test';
  
  for (const name of RPC_NAMES) {
    try {
      const { data, error } = await supabase.rpc(name, { 
        p_sql: testSql,
        sql_text: testSql,
        query: testSql,
        sql: testSql,
      });
      if (!error) {
        console.log(`✅ Found working RPC: ${name}`);
        return { name, paramName: 'p_sql' };
      }
    } catch {}
    
    try {
      const { data, error } = await supabase.rpc(name, { sql_text: testSql });
      if (!error) {
        console.log(`✅ Found working RPC: ${name} (sql_text param)`);
        return { name, paramName: 'sql_text' };
      }
    } catch {}
  }
  
  // Try anon key RPC
  const { data: funcs, error } = await supabase
    .from('_rpc_info_')
    .select('*')
    .limit(1)
    .catch(() => ({ data: null, error: 'failed' }));
  
  console.log('RPC functions test failed, checking via REST...');
  return null;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  MENSALISTA REBORN MIGRATION v2');
  console.log('='.repeat(60));
  
  // First, let's try to directly use the REST API to execute SQL
  // Supabase Management API
  const projectRef = 'dbukdhycfaibdshxnatt';
  
  console.log('\n📋 Option 1: Check existing tables...');
  
  // Let's check if mensalista_plans already exists by trying to query it
  const { data: existingPlans, error: checkError } = await supabase
    .from('mensalista_plans')
    .select('id', { count: 'exact', head: true })
    .catch(() => ({ data: null, error: 'table not found' }));
    
  if (checkError) {
    console.log(`   Table doesn't exist yet: ${checkError.message || checkError}`);
  } else {
    console.log(`   Table exists with ${existingPlans?.length || 0} plans`);
    console.log('   Migration may have already been partially applied.');
  }

  console.log('\n📋 Option 2: Try Supabase REST API with service_role...');
  console.log('   The service_role key bypasses RLS but cannot run DDL via REST.');
  console.log('   DDL (CREATE TABLE, ALTER TABLE, etc.) requires direct DB access.');
  
  console.log('\n📋 Option 3: Try Management API...');
  try {
    const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: { 'Authorization': `Bearer ${supabaseKey}` }
    });
    if (resp.ok) {
      console.log('   ✅ Management API accessible with service_role key!');
    } else {
      console.log(`   ❌ Management API not accessible (status ${resp.status})`);
    }
  } catch (e) {
    console.log(`   ❌ Management API error: ${e.message}`);
  }
  
  console.log('\n📋 Step-by-step via REST (non-DDL operations)...');
  
  // For the functions and non-DDL operations, try creating them one by one
  const trials = [
    { name: 'get_mensalista_plans', sql: `CREATE OR REPLACE FUNCTION get_mensalista_plans()
RETURNS TABLE (id UUID, name TEXT, price DECIMAL, included_service_ids UUID[], allowed_days INTEGER[], duration_days INTEGER, is_active BOOLEAN, is_default BOOLEAN, sort_order INTEGER, created_at TIMESTAMPTZ) AS $$ BEGIN RETURN QUERY SELECT mp.id, mp.name, mp.price, mp.included_service_ids, mp.allowed_days, mp.duration_days, mp.is_active, mp.is_default, mp.sort_order, mp.created_at FROM mensalista_plans mp WHERE mp.is_active = TRUE ORDER BY mp.sort_order ASC, mp.name ASC; END; $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;` },
  ];
  
  for (const trial of trials) {
    try {
      const { data, error } = await supabase.rpc('exec_sql_diag', { p_sql: trial.sql }).catch(() => ({ data: null, error: 'failed' }));
      if (error) {
        console.log(`   ❌ ${trial.name}: ${error.message || error}`);
      } else {
        console.log(`   ✅ ${trial.name}: OK`);
      }
    } catch (e) {
      console.log(`   ❌ ${trial.name}: ${e.message}`);
    }
  }
  
  console.log('\n⚠️  Para aplicar a migration completa, acesse o SQL Editor do Supabase:');
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log('   Cole o conteúdo de supabase/migrations/007_mensalista_reborn.sql');
  console.log('   e clique em "Run".');
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});
