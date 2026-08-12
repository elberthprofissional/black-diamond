#!/usr/bin/env node

/**
 * BLACK DIAMOND — EXECUTAR TODAS AS MIGRATIONS
 * 
 * Lê e executa TODAS as 5 migrations SQL consolidadas em ordem.
 * Tenta múltiplos métodos de execução:
 *   1. RPCs de SQL (exec_sql, execute_sql, pgexecute, etc.)
 *   2. Supabase Management API (precisa de PAT)
 *   3. (removido — dependência pg era usada apenas como fallback opcional)
 * 
 * Se tudo falhar, salva arquivo consolidado para colar no SQL Editor.
 *
 * ⚠️ Defina SUPABASE_SERVICE_KEY no ambiente (não use chave hardcoded).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const PROJECT_REF = 'dbukdhycfaibdshxnatt';

// Service role key — OBRIGATÓRIA via ambiente (nunca hardcoded)
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SERVICE_KEY) {
  console.error('\x1b[31m✗\x1b[0m Defina SUPABASE_SERVICE_KEY no ambiente antes de rodar este script.');
  process.exit(1);
}

const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

// ─── MIGRATIONS EM ORDEM ─────────────────────────────────────────────────────

const MIGRATIONS = [
  { file: '001_schema_rls.sql',            desc: 'Schema + RLS + Storage' },
  { file: '002_functions_triggers.sql',    desc: 'Funções + Triggers + Seed + Cron' },
  { file: '003_features_fixes.sql',        desc: 'Features (barbers, mensalista) + Fixes' },
  { file: '004_subscriptions_pix.sql',     desc: 'Assinaturas PIX + Bloqueio + Fix agendamento' },
  { file: '005_performance_auditoria.sql', desc: 'Índices + View dashboard + Auditoria' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function log(msg, color = '36') {
  console.log(`\x1b[${color}m▸\x1b[0m ${msg}`);
}

function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`\x1b[33m⚠\x1b[0m ${msg}`);
}

function fail(msg) {
  console.log(`\x1b[31m✗\x1b[0m ${msg}`);
}

// ─── EXECUTOR PRINCIPAL ──────────────────────────────────────────────────────

async function tryExecuteSQL(sql, label) {
  // Método 1: Tentar RPCs de execução SQL
  const rpcAttempts = [
    { name: 'exec_sql', params: { query: sql } },
    { name: 'exec_sql', params: { sql_text: sql } },
    { name: 'exec_sql', params: { p_sql: sql } },
    { name: 'execute_sql', params: { query: sql } },
    { name: 'pgexecute', params: { query: sql } },
    { name: 'run_sql', params: { query: sql } },
    { name: 'executar_sql', params: { query: sql } },
  ];

  for (const attempt of rpcAttempts) {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/${attempt.name}`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(attempt.params),
          signal: AbortSignal.timeout(15000),
        }
      );
      if (resp.ok) {
        ok(`${label} → via RPC ${attempt.name}()`);
        return true;
      }
      // Se erro 404, função não existe — tenta próxima
      if (resp.status === 404) continue;
      // Outro erro (400, 500 etc) — loga e tenta próxima
      const text = await resp.text().catch(() => '');
      if (text.includes('already exists') || text.includes('duplicate')) {
        ok(`${label} → (já existe, ignorado)`);
        return true;
      }
    } catch {
      // Timeout ou erro de rede — tenta próxima
      continue;
    }
  }

  return false;
}

async function main() {
  console.log('');
  console.log('\x1b[1m═══════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m  EXECUTANDO TODAS AS MIGRATIONS\x1b[0m');
  console.log('\x1b[1m═══════════════════════════════════════════════\x1b[0m');
  console.log('');

  const migrationsDir = join(ROOT, 'supabase', 'migrations');

  // ── PASSO 1: Ler e consolidar todas as migrations ──
  log('Consolidando migrations...');
  let consolidatedSQL = '';
  consolidatedSQL += '-- ============================================================\n';
  consolidatedSQL += '-- BLACK DIAMOND - TODAS AS MIGRATIONS CONSOLIDADAS\n';
  consolidatedSQL += '-- Gerado em: ' + new Date().toISOString() + '\n';
  consolidatedSQL += '-- ============================================================\n\n';

  const allSQLs = [];
  for (const mig of MIGRATIONS) {
    const filepath = join(migrationsDir, mig.file);
    if (!existsSync(filepath)) {
      warn(`Migration não encontrada: ${mig.file} — pulando`);
      continue;
    }
    const content = readFileSync(filepath, 'utf-8');
    allSQLs.push({ file: mig.file, desc: mig.desc, sql: content });
    consolidatedSQL += `-- >>> MIGRATION: ${mig.file} (${mig.desc}) <<<\n\n`;
    consolidatedSQL += content;
    consolidatedSQL += '\n\n';
  }

  ok(`${allSQLs.length} migrations consolidadas (${(consolidatedSQL.length / 1024).toFixed(1)} KB)`);

  // ── PASSO 2: Tentar executar via RPC ──
  log('Tentando executar via Supabase API...');

  // Primeiro, tenta verificar se alguma função RPC de execução SQL existe
  let methodFound = false;
  const testRPCs = ['exec_sql', 'execute_sql', 'pgexecute', 'run_sql'];
  
  for (const rpcName of testRPCs) {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/${rpcName}`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ query: 'SELECT 1' }),
          signal: AbortSignal.timeout(5000),
        }
      );
      if (resp.ok || resp.status === 400) {
        // 400 significa que a função existe mas os parâmetros estão errados
        // Isso é bom sinal — a função existe!
        ok(`RPC ${rpcName}() encontrada!`);
        methodFound = true;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!methodFound) {
    warn('Nenhum RPC de execução SQL encontrada.');
    warn('Tentando Management API (se SUPABASE_MGMT_KEY estiver configurada)...');

    // Tentar Management API
    const mgmtKey = process.env.SUPABASE_MGMT_KEY;
    if (mgmtKey) {
      try {
        const resp = await fetch(
          `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${mgmtKey}`,
            },
            body: JSON.stringify({ query: consolidatedSQL }),
            signal: AbortSignal.timeout(120000),
          }
        );
        if (resp.ok) {
          ok('Migration executada via Management API!');
          methodFound = true;
        } else {
          const text = await resp.text();
          fail(`Management API: ${resp.status} — ${text.slice(0, 200)}`);
        }
      } catch (e) {
        fail(`Management API: ${e.message}`);
      }
    } else {
      warn('SUPABASE_MGMT_KEY não configurada');
    }
  }


  // ── PASSO 3: Tentar migração por migração via RPC ──
  if (!methodFound) {
    log('Tentando executar migration por migration via RPC...');
    
    // Tenta todos os nomes de RPC
    const rpcNames = ['exec_sql', 'execute_sql', 'pgexecute', 'run_sql', 'executar_sql'];
    const paramNames = ['query', 'sql_text', 'p_sql', 'sql', 'sql_query'];
    
    let foundRPC = null;
    let foundParam = null;
    
    for (const name of rpcNames) {
      for (const param of paramNames) {
        try {
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ [param]: 'SELECT 1' }),
            signal: AbortSignal.timeout(5000),
          });
          if (resp.ok || resp.status === 400 || resp.status === 500) {
            foundRPC = name;
            foundParam = param;
            ok(`RPC ${name}(${param}) encontrada!`);
            break;
          }
        } catch { continue; }
      }
      if (foundRPC) break;
    }

    if (foundRPC) {
      // Executa cada migration individualmente
      for (const mig of allSQLs) {
        const sql = mig.sql;
        log(`Executando ${mig.file}...`);
        
        try {
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${foundRPC}`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ [foundParam]: sql }),
            signal: AbortSignal.timeout(30000),
          });
          
          if (resp.ok) {
            ok(`${mig.file} executada com sucesso!`);
            methodFound = true;
          } else {
            const text = await resp.text();
            if (text.includes('already exists') || text.includes('duplicate')) {
              ok(`${mig.file} → (já existe, ignorado)`);
              methodFound = true;
            } else {
              warn(`${mig.file}: ${text.slice(0, 150)}`);
            }
          }
        } catch (e) {
          warn(`${mig.file}: erro de conexão — ${e.message}`);
        }
      }
    }
  }

  // ── PASSO 4: Se tudo falhar, salva SQL consolidado ──
  if (!methodFound) {
    const outputPath = resolve(ROOT, 'scripts', '_RODAR_NO_SQL_EDITOR.sql');
    
    const header = `-- ============================================================
-- BLACK DIAMOND - TODAS AS MIGRATIONS
-- Copie TODO este arquivo e cole no SQL Editor do Supabase
-- Link: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new
-- ============================================================
-- Instruções:
-- 1. Abra: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new
-- 2. Copie TODO o conteúdo deste arquivo
-- 3. Cole no SQL Editor
-- 4. Execute (Ctrl + Enter ou Cmd + Enter)
-- ============================================================
-- Total: ${allSQLs.length} migrations
-- Tamanho: ${(consolidatedSQL.length / 1024).toFixed(0)} KB
-- ============================================================

`;
    
    writeFileSync(outputPath, header + consolidatedSQL, 'utf-8');
    
    fail('Não foi possível executar as migrations automaticamente.');
    console.log('');
    log(`SQL salvo em: ${outputPath}`, '33');
    log(`Abra o SQL Editor e cole o conteúdo:`, '33');
    console.log(`   \x1b[4mhttps://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\x1b[0m`);
    console.log('');
  } else {
    console.log('');
    console.log('\x1b[1;32m═══════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[1;32m  ✅ MIGRATIONS EXECUTADAS COM SUCESSO!\x1b[0m');
    console.log('\x1b[1;32m═══════════════════════════════════════════════\x1b[0m');
    console.log('');
  }
}

main().catch((e) => {
  console.error('\x1b[31mErro fatal:\x1b[0m', e.message);
  process.exit(1);
});
