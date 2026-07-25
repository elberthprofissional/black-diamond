/**
 * Migration: Recreate mensalista_plans system
 * Tries Supabase Management API to execute SQL
 */
const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

async function main() {
  console.log('='.repeat(60));
  console.log('  MENSALISTA REBORN MIGRATION');
  console.log('='.repeat(60));

  // Check if mensalista_plans table already exists by querying it
  console.log('\n📋 Checking existing tables...');
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/mensalista_plans?select=id&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log(`   ✅ mensalista_plans table exists with ${data.length} rows`);
    } else if (resp.status === 404) {
      console.log('   ❌ mensalista_plans table NOT FOUND (need to run DDL)');
    } else {
      console.log(`   ⚠️ Status ${resp.status}: ${await resp.text().catch(() => '')}`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Try Supabase Management API
  const projectRef = 'dbukdhycfaibdshxnatt';
  console.log(`\n📋 Trying Supabase Management API for project ${projectRef}...`);
  
  try {
    const mgmtResp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });
    console.log(`   Management API: status ${mgmtResp.status}`);
    if (mgmtResp.ok) {
      const project = await mgmtResp.json();
      console.log(`   Project: ${project.name}`);
      
      // Try to execute SQL via Management API
      const sqlQuery = `
        CREATE TABLE IF NOT EXISTS mensalista_plans (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          included_service_ids UUID[] DEFAULT '{}',
          allowed_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',
          duration_days INTEGER NOT NULL DEFAULT 30,
          is_active BOOLEAN DEFAULT TRUE,
          is_default BOOLEAN DEFAULT FALSE,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      
      const sqlResp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sqlQuery }),
      });
      console.log(`   SQL execution: status ${sqlResp.status}`);
      const sqlText = await sqlResp.text();
      console.log(`   Response: ${sqlText.substring(0, 200)}`);
    } else {
      const errText = await mgmtResp.text();
      console.log(`   Error: ${errText.substring(0, 200)}`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('  INSTRUÇÕES PARA EXECUTAR A MIGRATION');
  console.log('='.repeat(60));
  console.log('\nAcesse o SQL Editor do Supabase:');
  console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log('\nCopie o conteúdo do arquivo:');
  console.log('  supabase/migrations/007_mensalista_reborn.sql');
  console.log('\nCole no SQL Editor e clique em "Run".');
}

main().catch(console.error);
