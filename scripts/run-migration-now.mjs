/**
 * Tenta executar migration SQL no Supabase de TODAS as formas possíveis.
 * 1. Tenta RPC exec_sql (vários nomes)
 * 2. Tenta PostgreSQL connection string se disponível
 * 3. Se falhar tudo, salva SQL consolidado pra copiar e colar
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const PROJECT_REF = 'dbukdhycfaibdshxnatt';

// Ler chave do ambiente ou usar a fornecida
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
};

// Lê o SQL da migration corrigida
const migrationPath = resolve(__dirname, '..', 'supabase', 'migrations', '012_monthly_subscriptions.sql');
const sql = readFileSync(migrationPath, 'utf-8');

async function main() {
  console.log('='.repeat(60));
  console.log('  EXECUTANDO MIGRATION 012 - VERSAO CORRIGIDA');
  console.log('='.repeat(60));

  // Método 1: Tentar RPCs de execução SQL
  console.log('\n📋 Método 1: Buscando RPC de execução SQL...');
  const rpcNames = ['exec_sql', 'exec_sql_diag', 'execute_sql', 'pgexecute', 'run_sql'];
  const paramNames = ['sql_text', 'p_sql', 'query', 'sql', 'sql_query'];
  
  let found = false;
  for (const name of rpcNames) {
    for (const param of paramNames) {
      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ [param]: 'SELECT 1' }),
        });
        if (resp.ok || resp.status === 200) {
          console.log(`   ✅ Found: ${name}(${param})`);
          found = true;
          
          // Extrai statements do SQL
          const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 10 && !s.startsWith('--') && !s.startsWith('/*'));
          
          console.log(`\n📋 Executando ${statements.length} statements...`);
          let ok = 0, fail = 0;
          
          for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i] + ';';
            const preview = stmt.substring(0, 60).replace(/\n/g, ' ').trim();
            try {
              const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ [param]: stmt }),
              });
              if (r.ok) { ok++; } 
              else { 
                const t = await r.text();
                console.log(`   ⚠️  [${i+1}] ${t.substring(0, 80)}`);
                fail++; 
              }
            } catch(e) { fail++; }
          }
          
          if (fail === 0) {
            console.log(`\n✅ MIGRATION EXECUTADA COM SUCESSO! (${ok} statements)`);
          } else {
            console.log(`\n⚠️  ${ok} ok, ${fail} falhas`);
          }
          break;
        }
      } catch {}
    }
    if (found) break;
  }

  if (!found) {
    console.log('\n❌ Nenhum RPC de execução SQL encontrado.');
    
    // Método 2: Tentar usar o endpoint SQL do Supabase Management API
    console.log('\n📋 Método 2: Tentando Management API...');
    const mgmtKey = process.env.SUPABASE_MGMT_KEY;
    if (mgmtKey) {
      try {
        const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mgmtKey}`,
          },
          body: JSON.stringify({ query: sql }),
        });
        if (resp.ok) {
          console.log('   ✅ Migration executada via Management API!');
          found = true;
        } else {
          const t = await resp.text();
          console.log(`   ⚠️  ${resp.status}: ${t.substring(0, 100)}`);
        }
      } catch(e) {
        console.log(`   ❌ ${e.message}`);
      }
    } else {
      console.log('   ⚠️  SUPABASE_MGMT_KEY não configurada');
    }
  }

  // Método 3: Tentar pg (conexão direta PostgreSQL)
  if (!found) {
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (dbUrl) {
      console.log('\n📋 Método 3: Tentando conexão direta PostgreSQL...');
      try {
        const { default: pg } = await import('pg');
        const client = new pg.Client({ connectionString: dbUrl });
        await client.connect();
        await client.query(sql);
        console.log('   ✅ Migration executada via PostgreSQL direto!');
        await client.end();
        found = true;
      } catch(e) {
        console.log(`   ❌ ${e.message}`);
      }
    } else {
      console.log('   ⚠️  DATABASE_URL não configurada');
    }
  }

  // Se tudo falhar, salva SQL consolidado para copiar e colar
  if (!found) {
    const consolidatedPath = resolve(__dirname, '..', 'scripts', '_RODAR_NO_SQL_EDITOR.sql');
    writeFileSync(consolidatedPath, 
      '-- ============================================================\n' +
      '-- BLACK DIAMOND - MIGRATION 012 (CORRIGIDA)\n' +
      '-- Copie TODO este arquivo e cole no SQL Editor do Supabase\n' +
      '-- Link: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new\n' +
      '-- ============================================================\n\n' +
      sql
    );
    
    console.log(`\n❌ Não foi possível executar automaticamente.`);
    console.log(`\n📄 SQL salvo em: ${consolidatedPath}`);
    console.log(`\n🔗 Abra o SQL Editor:`);
    console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
    console.log(`\n📋 Copie o conteúdo do arquivo e cole lá.`);
  }
}

main().catch(console.error);
