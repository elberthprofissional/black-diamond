#!/usr/bin/env node
/**
 * audit-360.mjs — Auditoria 360° do Black Diamond (um script, N modos)
 * =========================================================================
 * Consolida os utilitários de auditoria criados durante a revisão completa:
 *
 *   node scripts/audit-360.mjs                    → auditoria completa (READ-ONLY)
 *   node scripts/audit-360.mjs anon               → probe: o que a chave anon lê
 *   node scripts/audit-360.mjs producao           → verifica bundle de produção
 *   node scripts/audit-360.mjs keys               → compara chaves do .env vs publishable
 *   node scripts/audit-360.mjs recon <PAT>        → recon para backfill/limpeza
 *   node scripts/audit-360.mjs backup <PAT>       → backup das tabelas legadas
 *   node scripts/audit-360.mjs limpeza <PAT>      → executa limpeza (vault + drop + backfill)
 *
 * Modos que mexem no banco (recon/backup/limpeza) exigem o PAT sbp_...
 * como argumento. Os demais leem o .env.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_REF = 'dbukdhycfaibdshxnatt';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const BACKUP_PATH = resolve(ROOT, 'scripts', 'backup-pre-limpieza.json');

// ─────────────────────────────────────────────────────────────
// Helpers compartilhados
// ─────────────────────────────────────────────────────────────

function readPAT(argv) {
  return argv.find((a) => a.startsWith('sbp_')) || undefined;
}

function getPAT(argv) {
  const t = readPAT(argv);
  if (!t) {
    console.error('❌ PAT (sbp_...) não fornecido. Passe como argumento.');
    process.exit(1);
  }
  return t;
}

async function q(TOKEN, sql) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) return { error: text.slice(0, 400) };
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function loadEnv() {
  const envContent = readFileSync(resolve(ROOT, '.env'), 'utf8');
  const get = (k) => envContent.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();
  return {
    URL: get('VITE_SUPABASE_URL'),
    ANON: get('VITE_SUPABASE_ANON_KEY'),
    PUBLISHABLE: get('SUPABASE_PUBLISHABLE_KEY'),
  };
}

// ─────────────────────────────────────────────────────────────
// MODO: audit (padrão) — Auditoria completa READ-ONLY
// ─────────────────────────────────────────────────────────────

function guard(sql) {
  const stripped = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').trim();
  if (!/^SELECT\b/i.test(stripped) && !/^WITH\b/i.test(stripped)) {
    throw new Error(`⛔ Query bloqueada pela trava read-only: ${sql.slice(0, 80)}`);
  }
  const FORBIDDEN = /(^|[^\w_])(UPDATE|DELETE|INSERT|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|VACUUM|REINDEX)([^\w_]|$)/gi;
  if (FORBIDDEN.test(stripped)) {
    throw new Error(`⛔ Query bloqueada pela trava read-only: ${sql.slice(0, 80)}`);
  }
}

let totalChecks = 0;
let totalIssues = 0;

async function query(label, sql, TOKEN) {
  guard(sql);
  totalChecks++;
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
    if (!res.ok) {
      console.log(`\n❌ [${label}] HTTP ${res.status}: ${text.slice(0, 300)}`);
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (e) {
    console.log(`\n❌ [${label}] Exceção: ${e.message}`);
    return null;
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(70)}`);
}

function flag(condition, label, detail = '') {
  if (condition) {
    totalIssues++;
    console.log(`  🔴 ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`  ✅ ${label}`);
  }
}

async function runAudit(TOKEN) {
  console.log(`🔬 AUDITORIA 360° — BLACK DIAMOND (projeto ${PROJECT_REF})`);
  console.log(`   Data: ${new Date().toISOString()}`);

  section('1. EXTENSÕES');
  const exts = await query('extensions', 'SELECT extname, extversion FROM pg_extension ORDER BY extname;', TOKEN);
  if (exts) {
    for (const e of exts) console.log(`   ${e.extname} v${e.extversion}`);
    if (!exts.some((e) => e.extname === 'pg_cron')) {
      totalIssues++;
      console.log('   🔴 pg_cron NÃO instalado — crons do projeto podem não rodar!');
    } else {
      console.log('   ✅ pg_cron instalado.');
    }
  }

  section('2. TABELAS public + CONTAGEM');
  const tables = await query('tables', `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`, TOKEN);
  if (!tables) return;
  const tableNames = tables.map((t) => t.tablename);
  console.log(`   ${tableNames.length} tabela(s): ${tableNames.join(', ')}`);

  const countsSql = tableNames
    .map((t) => `SELECT '${t}' AS tbl, count(*) AS n FROM "${t}"`)
    .join('\nUNION ALL\n');
  const counts = await query('counts', `${countsSql};`, TOKEN);
  if (counts) {
    const zeroTables = [];
    for (const c of counts) {
      const n = Number(c.n);
      console.log(`   ${c.tbl.padEnd(24)} ${n}`);
      if (
        n === 0 &&
        !['audit_logs', 'rate_limits', 'reminder_logs', 'payment_logs', 'payment_blocked_users', 'booking_tokens', 'push_subscriptions', 'whatsapp_templates', 'client_milestones'].includes(c.tbl)
      ) {
        zeroTables.push(c.tbl);
      }
    }
    if (zeroTables.length) {
      console.log(`   ℹ️  Tabelas potencialmente sem dados: ${zeroTables.join(', ')}`);
    }
  }

  section('3. TABELAS SEM RLS (risco de segurança)');
  const noRls = await query('tables-without-rls', `
    SELECT c.relname AS tablename
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
    ORDER BY c.relname;`, TOKEN);
  if (noRls) {
    if (noRls.length === 0) console.log('   ✅ Todas as tabelas têm RLS ativo.');
    else for (const t of noRls) console.log(`   🔴 ${t.tablename} — SEM RLS!`);
  }

  section('4. POLÍTICAS RLS (todas)');
  const policies = await query('policies', `
    SELECT tablename, policyname, cmd, roles::text AS roles, qual, with_check
    FROM pg_policies WHERE schemaname = 'public'
    ORDER BY tablename, cmd;`, TOKEN);
  if (policies) {
    if (policies.length === 0) console.log('   ⚠️ Nenhuma política encontrada!');
    for (const p of policies) {
      console.log(`   ${p.tablename}.${p.policyname} [${p.cmd}] roles=${p.roles}`);
      console.log(`       USING: ${p.qual || '(todas)'}`);
      if (p.with_check) console.log(`       CHECK: ${p.with_check}`);
    }
    const sensitive = ['clients', 'bookings', 'admin_users', 'notifications', 'booking_tokens', 'subscriptions', 'payment_logs', 'coupons', 'audit_logs', 'settings'];
    const anonWrite = policies.filter(
      (p) => p.roles.includes('anon') && ['INSERT', 'UPDATE', 'DELETE'].includes(p.cmd) && sensitive.includes(p.tablename)
    );
    if (anonWrite.length) {
      console.log(`\n   🚨 ${anonWrite.length} política(s) de ESCRITA para anon em tabela sensível!`);
      for (const p of anonWrite) console.log(`      - ${p.tablename}.${p.policyname} [${p.cmd}] ${p.with_check || p.qual || ''}`);
    } else {
      console.log('   ✅ Nenhuma escrita anon em tabelas sensíveis.');
    }
  }

  section('5. GRANTS para anon/authenticated');
  const grants = await query('grants', `
    SELECT grantee, table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE grantee IN ('anon', 'authenticated')
    ORDER BY table_name, grantee, privilege_type;`, TOKEN);
  if (grants) {
    if (grants.length === 0) console.log('   ✅ Nenhum grant direto para anon/authenticated.');
    else for (const g of grants) console.log(`   ${g.table_name}.${g.privilege_type} -> ${g.grantee}`);
  }

  section('6. COLUNAS CORE TABLES');
  for (const t of ['bookings', 'clients', 'services', 'settings', 'coupons', 'barbers', 'subscriptions']) {
    const cols = await query(`columns-${t}`, `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${t}'
      ORDER BY ordinal_position;`, TOKEN);
    if (cols && cols.length) {
      console.log(`\n   ${t}:`);
      for (const c of cols) {
        const def = c.column_default ? ` = ${c.column_default}` : '';
        const nul = c.is_nullable === 'NO' ? ' NOT NULL' : '';
        console.log(`     - ${c.column_name} ${c.data_type}${nul}${def}`);
      }
    } else if (cols !== null) {
      console.log(`\n   ℹ️ ${t}: tabela não existe no schema public`);
    }
  }

  section('7. FUNÇÕES (RPCs)');
  const funcs = await query('functions', `
    SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args, p.prosecdef AS security_definer
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
    ORDER BY p.proname;`, TOKEN);
  if (funcs) {
    console.log(`   ${funcs.length} função(ões) RPC.`);
    const definers = funcs.filter((f) => f.security_definer);
    if (definers.length) {
      console.log(`   ℹ️  SECURITY DEFINER (rodam como dono — atenção):`);
      for (const f of definers) console.log(`     - ${f.name}(${f.args})`);
    }
  }

  section('8. TRIGGERS');
  const triggers = await query('triggers', `
    SELECT tgname AS name, tgrelid::regclass AS tbl, pg_get_triggerdef(oid) AS def
    FROM pg_trigger WHERE NOT tgisinternal
    ORDER BY tgrelid::regclass::text;`, TOKEN);
  if (triggers) {
    if (triggers.length === 0) console.log('   ⚠️ Nenhum trigger!');
    for (const t of triggers) {
      console.log(`   ${t.tbl}.${t.name}`);
      console.log(`     ${t.def}`);
    }
  }

  section('9. ÍNDICES E UNIQUE CONSTRAINTS');
  const indexes = await query('indexes', `
    SELECT tablename, indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' ORDER BY tablename, indexname;`, TOKEN);
  if (indexes) {
    for (const i of indexes) console.log(`   ${i.tablename}.${i.indexname}`);
  }

  section('10. CRON JOBS (pg_cron)');
  const crons = await query('cron', `SELECT jobid, schedule, command FROM cron.job ORDER BY jobid;`, TOKEN);
  if (crons) {
    for (const c of crons) console.log(`   #${c.jobid} ${c.schedule} — ${c.command}`);
    if (crons.length === 0) console.log('   ⚠️ Nenhum job de cron configurado!');
  } else {
    console.log('   ℹ️ pg_cron não disponível.');
  }

  section('11. STORAGE');
  const buckets = await query('buckets', `SELECT id, name, public FROM storage.buckets ORDER BY name;`, TOKEN);
  if (buckets) {
    for (const b of buckets) console.log(`   ${b.name} (public=${b.public})`);
    const objects = await query('objects', `SELECT bucket_id, count(*) AS n FROM storage.objects GROUP BY bucket_id;`, TOKEN);
    if (objects) for (const o of objects) console.log(`   ${o.bucket_id}: ${o.n} objeto(s)`);
  }

  section('12. INTEGRIDADE DE DADOS');
  totalChecks += 10;

  const dupClients = await query('dup-clients', `
    SELECT phone, count(*) AS n, string_agg(name, ' | ') AS names
    FROM clients WHERE phone IS NOT NULL AND phone <> ''
    GROUP BY phone HAVING count(*) > 1 ORDER BY n DESC;`, TOKEN);
  if (dupClients && dupClients.length) {
    totalIssues++;
    console.log(`   🔴 ${dupClients.length} telefone(s) duplicado(s) em clients:`);
    for (const d of dupClients) console.log(`      - ${d.phone} (${d.n}x): ${d.names}`);
  } else {
    console.log('   ✅ Nenhum cliente duplicado por telefone.');
  }

  const orphanBookings = await query('orphan-bookings', `
    SELECT count(*) AS n FROM bookings b
    LEFT JOIN clients c ON c.id = b.client_id
    WHERE b.client_id IS NOT NULL AND c.id IS NULL;`, TOKEN);
  if (orphanBookings && Number(orphanBookings[0].n) > 0) {
    totalIssues++;
    console.log(`   🔴 ${orphanBookings[0].n} booking(s) sem cliente válido.`);
  } else {
    console.log('   ✅ Nenhum booking órfão (sem cliente).');
  }

  const orphanServices = await query('orphan-services', `
    SELECT count(*) AS n FROM (
      SELECT b.id FROM bookings b, unnest(b.service_ids) AS sid
      LEFT JOIN services s ON s.id = sid
      WHERE s.id IS NULL GROUP BY b.id
    ) x;`, TOKEN);
  if (orphanServices && Number(orphanServices[0].n) > 0) {
    totalIssues++;
    console.log(`   🔴 ${orphanServices[0].n} booking(s) referenciando serviço inexistente.`);
  } else {
    console.log('   ✅ Nenhum booking com serviço órfão.');
  }

  const badStatus = await query('bad-status', `SELECT status, count(*) AS n FROM bookings GROUP BY status ORDER BY n DESC;`, TOKEN);
  if (badStatus) {
    const valid = ['pending', 'confirmed', 'cancelled', 'completed', 'blocked', 'no_show'];
    for (const s of badStatus) {
      if (!valid.includes(s.status)) {
        totalIssues++;
        console.log(`   🔴 Status inválido: '${s.status}' (${s.n}x)`);
      }
    }
    console.log(`   ℹ️ Distribuição: ${badStatus.map((s) => `${s.status}=${s.n}`).join(', ')}`);
  }

  const stale = await query('stale-bookings', `
    SELECT count(*) AS n FROM bookings
    WHERE booking_date < CURRENT_DATE AND status IN ('pending', 'confirmed');`, TOKEN);
  if (stale && Number(stale[0].n) > 0) {
    totalIssues++;
    console.log(`   🔴 ${stale[0].n} booking(s) pendente/confirmado em data PASSADA.`);
  } else {
    console.log('   ✅ Nenhum booking pendente/confirmado no passado.');
  }

  const staleToday = await query('stale-today', `
    SELECT count(*) AS n FROM bookings
    WHERE booking_date = CURRENT_DATE AND booking_time < CURRENT_TIME
      AND status IN ('pending', 'confirmed');`, TOKEN);
  if (staleToday && Number(staleToday[0].n) > 0) {
    totalIssues++;
    console.log(`   🔴 ${staleToday[0].n} booking(s) hoje com horário já passado e status ativo.`);
  } else {
    console.log('   ✅ Nenhum booking ativo com horário já passado hoje.');
  }

  const expiredCoupons = await query('expired-coupons', `
    SELECT code, valid_until, is_active FROM coupons
    WHERE is_active = true AND (valid_until < CURRENT_DATE);`, TOKEN);
  if (expiredCoupons && expiredCoupons.length) {
    totalIssues++;
    console.log(`   🔴 ${expiredCoupons.length} cupom(ns) ATIVO(s) mas VENCIDO(s):`);
    for (const c of expiredCoupons) console.log(`      - ${c.code} (venceu em ${c.valid_until})`);
  } else {
    console.log('   ✅ Nenhum cupom ativo vencido.');
  }

  const usedUpCoupons = await query('used-up-coupons', `
    SELECT code, current_uses, max_uses FROM coupons
    WHERE is_active = true AND max_uses > 0 AND current_uses >= max_uses;`, TOKEN);
  if (usedUpCoupons && usedUpCoupons.length) {
    totalIssues++;
    console.log(`   🔴 ${usedUpCoupons.length} cupom(ns) ativo(s) com usos esgotados:`);
    for (const c of usedUpCoupons) console.log(`      - ${c.code} (${c.current_uses}/${c.max_uses})`);
  } else {
    console.log('   ✅ Nenhum cupom ativo esgotado.');
  }

  const blockedWithServices = await query('blocked-services', `
    SELECT count(*) AS n FROM bookings
    WHERE is_blocked = true AND (service_ids IS NOT NULL AND cardinality(service_ids) > 0);`, TOKEN);
  if (blockedWithServices && Number(blockedWithServices[0].n) > 0) {
    totalIssues++;
    console.log(`   ⚠️ ${blockedWithServices[0].n} booking(s) bloqueado(s) com serviço(s) associado(s).`);
  } else {
    console.log('   ✅ Bloqueios sem serviços (esperado).');
  }

  const expiredTokens = await query('expired-tokens', `
    SELECT count(*) AS n FROM booking_tokens WHERE expires_at < now();`, TOKEN);
  if (expiredTokens && Number(expiredTokens[0].n) > 0) {
    console.log(`   ⚠️ ${expiredTokens[0].n} token(s) de booking expirado(s) (cron de limpeza deve cuidar).`);
  } else {
    console.log('   ✅ Nenhum token expirado.');
  }

  section('13. AUTH E ADMIN');
  const users = await query('users', `
    SELECT count(*) AS n, count(*) FILTER (WHERE email_confirmed_at IS NOT NULL) AS confirmed
    FROM auth.users;`, TOKEN);
  if (users) {
    console.log(`   👤 ${users[0].n} usuário(s) (${users[0].confirmed} com email confirmado).`);
    const adminList = await query('admins', `
      SELECT au.user_id, u.email, u.created_at
      FROM admin_users au LEFT JOIN auth.users u ON u.id = au.user_id;`, TOKEN);
    if (adminList) {
      if (adminList.length === 0) {
        totalIssues++;
        console.log('   🔴 NENHUM admin cadastrado em admin_users!');
      }
      for (const a of adminList) console.log(`   ✅ admin: ${a.email || a.user_id}${a.created_at ? ` (desde ${a.created_at?.slice(0, 10)})` : ''}`);
    }
    const usersNoAdmin = await query('users-no-admin', `
      SELECT u.email FROM auth.users u
      LEFT JOIN admin_users au ON au.user_id = u.id
      WHERE au.user_id IS NULL ORDER BY u.created_at DESC;`, TOKEN);
    if (usersNoAdmin) {
      if (usersNoAdmin.length === 0) console.log('   ✅ Todos os usuários auth são admins.');
      else {
        console.log(`   ⚠️ ${usersNoAdmin.length} usuário(s) auth sem admin_users:`);
        for (const u of usersNoAdmin) console.log(`      - ${u.email}`);
      }
    }
  }

  section('14. NOTIFICAÇÕES E TOKENS');
  const notifOrphans = await query('notif-orphans', `
    SELECT count(*) AS n FROM notifications n
    LEFT JOIN auth.users u ON u.id = n.user_id WHERE u.id IS NULL;`, TOKEN);
  if (notifOrphans) {
    if (Number(notifOrphans[0].n) > 0) {
      totalIssues++;
      console.log(`   🔴 ${notifOrphans[0].n} notificação(ões) com user_id órfão.`);
    } else {
      console.log('   ✅ Nenhuma notificação órfã.');
    }
  }
  const notifUnread = await query('notif-unread', `
    SELECT count(*) FILTER (WHERE read = false) AS unread, count(*) AS total FROM notifications;`, TOKEN);
  if (notifUnread) console.log(`   ℹ️ Notificações: ${notifUnread[0].unread} não lidas / ${notifUnread[0].total} total.`);

  section('15. SETTINGS');
  const settingsRows = await query('settings', `SELECT key, value FROM settings ORDER BY key;`, TOKEN);
  if (settingsRows) {
    for (const s of settingsRows) {
      const v = String(s.value ?? '').slice(0, 100);
      console.log(`   ${s.key} = ${v}${String(s.value ?? '').length > 100 ? '…' : ''}`);
    }
    const critical = ['opening_time', 'closing_time', 'working_days', 'barber_phone', 'barber_hours'];
    for (const k of critical) {
      if (!settingsRows.some((s) => s.key === k)) {
        totalIssues++;
        console.log(`   🔴 Setting crítico FALTANDO: ${k}`);
      }
    }
  }

  section('16. TABELAS FORA DAS MIGRATIONS / SUSPEITAS');
  const suspeitas = ['admin_settings', 'system_settings', 'secrets', 'fixed_expenses', 'expenses', 'recurring_expenses', 'barber_commissions', 'barber_schedules', 'loyalty_config'];
  // Só consulta tabelas que existem (as já dropadas não geram erro)
  const existing = new Set(
    (await query('existing-tables', "SELECT tablename FROM pg_tables WHERE schemaname = 'public';", TOKEN) ?? []).map((r) => r.tablename)
  );
  const presentes = suspeitas.filter((t) => existing.has(t));
  if (presentes.length < suspeitas.length) {
    console.log(`   ℹ️ Removidas/anteriormente limpas: ${suspeitas.filter((t) => !existing.has(t)).join(', ')}`);
  }
  for (const t of presentes) {
    const cols = await query(`cols-${t}`, `
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${t}'
      ORDER BY ordinal_position;`, TOKEN);
    if (cols && cols.length) {
      console.log(`\n   ${t}: ${cols.map((c) => `${c.column_name} (${c.data_type})`).join(', ')}`);
    }
  }
  if (existing.has('secrets')) {
    const secrets = await query('secrets-count', `SELECT count(*) AS n FROM public.secrets;`, TOKEN);
    if (secrets) {
      console.log(`\n   public.secrets: ${secrets[0].n} registro(s). Colunas acima.`);
      const secretKeys = await query('secrets-keys', `SELECT key, substring(value, 1, 4) AS prefixo FROM public.secrets LIMIT 10;`, TOKEN);
      if (secretKeys) {
        for (const s of secretKeys) {
          console.log(`      - key=${s.key} (prefixo: ${s.prefixo}${s.prefixo ? '***' : ''})`);
        }
      }
    }
  }
  if (existing.has('admin_settings')) {
    const adminSettings = await query('admin-settings', `SELECT * FROM admin_settings LIMIT 3;`, TOKEN);
    if (adminSettings) console.log(`   admin_settings: ${JSON.stringify(adminSettings).slice(0, 300)}`);
  }
  if (existing.has('system_settings')) {
    const systemSettings = await query('system-settings', `SELECT * FROM system_settings LIMIT 3;`, TOKEN);
    if (systemSettings) console.log(`   system_settings: ${JSON.stringify(systemSettings).slice(0, 300)}`);
  }
  if (existing.has('fixed_expenses')) {
    const fixedExpenses = await query('fixed-expenses', `SELECT * FROM fixed_expenses LIMIT 3;`, TOKEN);
    if (fixedExpenses) console.log(`   fixed_expenses: ${JSON.stringify(fixedExpenses).slice(0, 300)}`);
  }

  section('📊 RESUMO');
  console.log(`   Checks executados: ${totalChecks}`);
  console.log(`   Problemas encontrados: ${totalIssues}`);
  console.log(`   Fim: ${new Date().toISOString()}\n`);
}

// ─────────────────────────────────────────────────────────────
// MODO: anon — Probe do que a chave anon consegue ler
// ─────────────────────────────────────────────────────────────

async function runAnon() {
  const { URL, ANON } = loadEnv();
  if (!URL || !ANON) {
    console.error('❌ .env sem VITE_SUPABASE_URL/ANON_KEY');
    process.exit(1);
  }
  const TABLES = [
    'secrets', 'admin_settings', 'system_settings', 'fixed_expenses', 'expenses',
    'recurring_expenses', 'barber_commissions', 'barber_schedules', 'loyalty_config',
    'subscriptions', 'payment_logs', 'payment_blocked_users', 'booking_tokens',
    'notifications', 'audit_logs', 'clients', 'bookings', 'rate_limits',
    'push_subscriptions', 'whatsapp_templates', 'coupons', 'admin_users',
    'auth.users',
  ];
  console.log(`🔓 PROBE ANON — ${URL}\n`);
  for (const t of TABLES) {
    try {
      const res = await fetch(`${URL}/rest/v1/${t}?select=*&limit=3`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      if (res.status === 200) {
        const data = await res.json();
        console.log(`  🚨 ${t}: LIDA pelo anon! (${data.length} linha(s))`);
        if (data.length) console.log(`       amostra: ${JSON.stringify(data[0]).slice(0, 120)}`);
      } else if (res.status === 401) {
        console.log(`  ⚠️  ${t}: 401 (table/coluna não exposta no schema?)`);
      } else if (res.status === 404) {
        console.log(`  ✅ ${t}: 404 (não exposta) ou tabela não existe`);
      } else if (res.status === 425) {
        console.log(`  ⚠️  ${t}: 425 (acesso negado por RLS)`);
      } else {
        const text = (await res.text()).slice(0, 100);
        console.log(`  ℹ️  ${t}: HTTP ${res.status} ${text}`);
      }
    } catch (e) {
      console.log(`  ❌ ${t}: ${e.message.slice(0, 80)}`);
    }
  }
  console.log('\n✅ Probe concluído.');
}

// ─────────────────────────────────────────────────────────────
// MODO: producao — Verifica a chave no bundle de produção
// ─────────────────────────────────────────────────────────────

async function runProducao() {
  const BASE = 'https://black-diamond-wheat.vercel.app';
  const decode = (jwt) => {
    try {
      const p = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
      return { role: p.role, iss: (p.iss || '').slice(0, 60), exp: p.exp ? new Date(p.exp * 1000).toISOString() : 'n/a' };
    } catch (e) {
      return { err: e.message };
    }
  };

  console.log(`🔎 VERIFICAÇÃO DE PRODUÇÃO — ${BASE}\n`);

  const html = await (await fetch(BASE)).text();
  const htmlChunks = [...new Set([...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+\.js)"/g)].map((m) => m[1]))];

  let manifestChunks = [];
  try {
    const mf = await (await fetch(BASE + '/manifest.json')).json();
    if (mf.rev) manifestChunks = Object.keys(mf.rev).filter((f) => f.endsWith('.js'));
    else if (Array.isArray(mf)) manifestChunks = mf.map((e) => e.url).filter(Boolean);
    console.log(`Manifest PWA: ${manifestChunks.length} arquivo(s) JS listados.`);
  } catch (e) {
    console.log('Manifest PWA não encontrado:', e.message);
  }

  const all = [...new Set([...htmlChunks, ...manifestChunks.map((c) => (c.startsWith('/') ? c : '/' + c))])];
  console.log(`Total de chunks a varrer: ${all.length}\n`);

  let found = null;
  let url = null;
  const JWT_RE = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

  for (const c of all) {
    try {
      const js = await (await fetch(BASE + c)).text();
      const m = js.match(JWT_RE);
      if (m && !found) {
        found = m[0];
        console.log(`🔑 CHAVE ANON encontrada em: ${c}`);
      }
      if (!url) {
        const u = js.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
        if (u) url = u[0];
      }
    } catch {
      // chunk pode dar 404 (versões antigas do manifest) — ignora
    }
  }

  if (!url) url = `https://${PROJECT_REF}.supabase.co`;
  console.log(`Supabase URL: ${url}`);

  if (!found) {
    console.log('❌ Chave não encontrada em nenhum chunk estático/PRECACHE.');
    console.log('   → A chave provavelmente está em um chunk lazy-load (rota /agendar, /admin etc).');
    console.log('   → Isso NÃO significa que a produção está segura: a chave anon é pública por design.');
    console.log('   → O risco real seria encontrar uma chave service_role no bundle.');
    for (const route of ['/agendar', '/admin/login', '/admin', '/cliente', '/']) {
      try {
        const r = await fetch(BASE + route);
        const body = await r.text();
        const m = body.match(JWT_RE);
        if (m) {
          console.log(`   ✅ Chave via rota ${route} em HTML/JS inline.`);
          found = m[0];
          break;
        }
        const lazy = [...body.matchAll(/"(\/assets\/[^"]+\.js)"/g)];
        for (const l of lazy) {
          try {
            const js = await (await fetch(BASE + l[1])).text();
            const mm = js.match(JWT_RE);
            if (mm) {
              found = mm[0];
              console.log(`   ✅ Chave via chunk lazy ${l[1]} (rota ${route}).`);
              break;
            }
          } catch {}
        }
        if (found) break;
      } catch {}
    }
  }

  if (found) {
    const info = decode(found);
    console.log(`\n🔑 JWT do bundle (produção):`);
    console.log(`   role: ${info.role}`);
    console.log(`   iss: ${info.iss}`);
    console.log(`   exp: ${info.exp}`);

    const h = (k) => ({ apikey: k, Authorization: `Bearer ${k}` });
    for (const table of ['services', 'clients', 'secrets', 'bookings', 'admin_settings', 'subscriptions']) {
      try {
        const r = await fetch(`${url}/rest/v1/${table}?select=*&limit=2`, { headers: h(found) });
        const body = await r.text();
        let readable = false;
        try {
          const arr = JSON.parse(body);
          readable = Array.isArray(arr) && arr.length > 0;
        } catch {}
        if (readable) {
          console.log(`   🚨 ${table}: ${r.status} → ANON LÊ dados (${body.slice(0, 100)})`);
        } else if (r.status === 200) {
          console.log(`   ✅ ${table}: 200 → 0 linhas (RLS bloqueando) ✅`);
        } else {
          console.log(`   ✅ ${table}: HTTP ${r.status} → bloqueado ✅`);
        }
      } catch (e) {
        console.log(`   ℹ️ ${table}: exceção ${e.message.slice(0, 60)}`);
      }
    }
  } else {
    console.log('\n⚠️ Não foi possível extrair a chave (chunks lazy não pré-cacheados).');
    console.log('   Verificação parcial: nenhum chunk estático contém JWT. Bom sinal, mas');
    console.log('   recomenda-se testar manualmente com a chave real do painel Supabase.');
  }

  console.log('\n✅ Fim da verificação.');
}

// ─────────────────────────────────────────────────────────────
// MODO: keys — Compara chave publishable vs chave do .env
// ─────────────────────────────────────────────────────────────

async function runKeys() {
  const url = `https://${PROJECT_REF}.supabase.co`;
  // A chave publishable NUNCA deve ficar hardcoded no código: ela rotaciona.
  // Configure SUPABASE_PUBLISHABLE_KEY no .env para testar a chave publicada.
  const { ANON, PUBLISHABLE } = loadEnv();

  const headers = (k) => ({ apikey: k, Authorization: 'Bearer ' + k, Accept: 'application/json' });

  async function testKey(name, key, tables) {
    console.log(`\n=== ${name} ===`);
    for (const t of tables) {
      try {
        const r = await fetch(`${url}/rest/v1/${t}?select=*&limit=2`, { headers: headers(key) });
        const body = await r.text();
        let n = 'n/a';
        try {
          const arr = JSON.parse(body);
          n = Array.isArray(arr) ? arr.length + ' linha(s)' : body.slice(0, 60);
        } catch {
          n = body.slice(0, 60);
        }
        console.log(`  ${t.padEnd(18)} -> HTTP ${r.status} | ${n}`);
      } catch (e) {
        console.log(`  ${t.padEnd(18)} -> ERRO ${e.message.slice(0, 60)}`);
      }
    }
  }

  const publicas = ['services', 'settings', 'barbers', 'gallery_images', 'testimonials'];
  const sensiveis = ['secrets', 'clients', 'bookings', 'admin_settings', 'subscriptions', 'booking_tokens', 'payment_logs', 'notifications', 'push_subscriptions'];

  if (PUBLISHABLE) {
    await testKey('CHAVE PUBLISHABLE (SUPABASE_PUBLISHABLE_KEY do .env)', PUBLISHABLE, [...publicas, ...sensiveis]);
  } else {
    console.log('\n(.env sem SUPABASE_PUBLISHABLE_KEY — teste da publishable pulado)');
  }
  if (ANON) await testKey('CHAVE ATUAL DO .env (VITE_SUPABASE_ANON_KEY)', ANON, ['services', 'secrets', 'clients']);
  else console.log('\n(.env sem VITE_SUPABASE_ANON_KEY)');
}

// ─────────────────────────────────────────────────────────────
// MODO: recon — Recon read-only para backfill/limpeza
// ─────────────────────────────────────────────────────────────

async function runRecon(TOKEN) {
  console.log('=== BARBEIROS ===');
  console.log(JSON.stringify(await q(TOKEN, "SELECT id, name, is_active, is_owner, is_hidden FROM barbers ORDER BY sort_order, name;"), null, 1));

  console.log('\n=== BOOKINGS SEM barber_id (contagem + amostra) ===');
  const cnt = await q(TOKEN, "SELECT count(*) AS total FROM bookings WHERE barber_id IS NULL;");
  console.log('count:', JSON.stringify(cnt));
  console.log(JSON.stringify(await q(TOKEN, "SELECT id, booking_date, booking_time, status, created_at FROM bookings WHERE barber_id IS NULL ORDER BY booking_date LIMIT 10;"), null, 1));

  console.log('\n=== LINHAS EM TABELAS SUSPEITAS ===');
  for (const t of ['secrets', 'admin_settings', 'system_settings', 'barber_schedules', 'barber_commissions', 'fixed_expenses', 'expenses', 'loyalty_config']) {
    const r = await q(TOKEN, `SELECT count(*) AS n FROM ${t};`);
    const n = r?.error ?? r?.[0]?.n ?? 'erro';
    console.log(`${t.padEnd(20)} -> ${n}`);
  }

  console.log('\n=== SETTINGS RELEVANTES ===');
  console.log(JSON.stringify(await q(TOKEN, "SELECT key, value FROM settings WHERE key IN ('single_barber_mode','default_barber_id','multi_barber_enabled','barber_id') ORDER BY key;"), null, 1));
}

// ─────────────────────────────────────────────────────────────
// MODO: backup — Backup das tabelas legadas antes da limpeza
// ─────────────────────────────────────────────────────────────

const mask = (v) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (!s) return s;
  if (s.length > 12) return s.slice(0, 6) + '***' + s.slice(-4) + ` (len=${s.length})`;
  return '***';
};

async function runBackup(TOKEN) {
  const backup = {};
  backup.secrets = await q(TOKEN, 'SELECT * FROM secrets;');
  backup.admin_settings = await q(TOKEN, 'SELECT * FROM admin_settings;');
  backup.system_settings = await q(TOKEN, 'SELECT * FROM system_settings;');
  backup.barbers = await q(TOKEN, 'SELECT id, name, is_owner, is_hidden, is_active FROM barbers ORDER BY name;');
  backup.bookings_sem_barber = await q(TOKEN, 'SELECT id, booking_date, booking_time, status FROM bookings WHERE barber_id IS NULL;');

  writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2));
  console.log(`Backup salvo em ${BACKUP_PATH}\n`);

  for (const k of Object.keys(backup)) {
    const v = backup[k];
    if (v.error) {
      console.log(`${k.padEnd(20)} -> ERRO: ${v.error}`);
      continue;
    }
    console.log(`${k.padEnd(20)} -> ${Array.isArray(v) ? v.length + ' linha(s)' : JSON.stringify(v)}`);
  }

  console.log('\n=== secrets (mascarado) ===');
  for (const row of backup.secrets ?? []) {
    const maskedRow = Object.fromEntries(
      Object.entries(row).map(([k2, v2]) => [k2, k2.toLowerCase().includes('key') || k2.includes('secret') ? mask(v2) : v2])
    );
    console.log(' ', JSON.stringify(maskedRow));
  }
  console.log('\n=== admin_settings (mascarado) ===');
  for (const row of backup.admin_settings ?? []) {
    const maskedRow = Object.fromEntries(
      Object.entries(row).map(([k2, v2]) => [k2, /hash|password|email/i.test(k2) ? mask(v2) : v2])
    );
    console.log(' ', JSON.stringify(maskedRow));
  }
}

// ─────────────────────────────────────────────────────────────
// MODO: limpeza — Executa a limpeza (vault + drop + backfill)
// ⚠️  MODIFICA O BANCO. Rode `backup` antes.
// ─────────────────────────────────────────────────────────────

async function runLimpeza(TOKEN) {
  const BARBER_TATO = '022393a3-63bd-41fc-8d03-267c58746475';
  let backup;
  try {
    backup = JSON.parse(readFileSync(BACKUP_PATH, 'utf8'));
  } catch {
    console.error('❌ Backup não encontrado. Rode primeiro: node scripts/audit-360.mjs backup <PAT>');
    process.exit(1);
  }

  console.log('═══ PASSO 1: Mover segredos para o Vault (best-effort) ═══');
  for (const row of backup.secrets ?? []) {
    const r = await q(TOKEN, `SELECT vault.create_secret('${row.value}', '${row.key}');`);
    console.log(`  vault: ${row.key} -> ${r.error ? 'falhou: ' + r.error : 'OK'}`);
  }

  console.log('\n═══ PASSO 2: DROP secrets e admin_settings ═══');
  for (const t of ['secrets', 'admin_settings']) {
    const r = await q(TOKEN, `DROP TABLE IF EXISTS public.${t};`);
    console.log(`  DROP ${t} -> ${r.error ? 'ERRO: ' + r.error : 'OK'}`);
  }

  console.log('\n═══ PASSO 3: Backfill barber_id (Tato) nos bookings órfãos ═══');
  const before = await q(TOKEN, 'SELECT count(*) AS n FROM bookings WHERE barber_id IS NULL;');
  console.log('  antes:', JSON.stringify(before));
  const up = await q(TOKEN, `UPDATE bookings SET barber_id = '${BARBER_TATO}' WHERE barber_id IS NULL;`);
  console.log('  update ->', up.error ? 'ERRO: ' + up.error : 'OK');
  const after = await q(TOKEN, 'SELECT count(*) AS n FROM bookings WHERE barber_id IS NULL;');
  console.log('  depois:', JSON.stringify(after));

  console.log('\n═══ VERIFICAÇÕES FINAIS ═══');
  const tables = await q(TOKEN, "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('secrets','admin_settings') ORDER BY tablename;");
  console.log('  tabelas legadas restantes:', JSON.stringify(tables));
  const orphans = await q(TOKEN, `SELECT count(*) AS n FROM bookings b LEFT JOIN barbers bb ON bb.id = b.barber_id WHERE b.barber_id IS NOT NULL AND bb.id IS NULL;`);
  console.log('  bookings com barber_id inexistente:', JSON.stringify(orphans));
  const ok = await q(TOKEN, `SELECT count(*) AS n FROM bookings WHERE barber_id = '${BARBER_TATO}';`);
  console.log('  bookings agora apontando para Tato:', JSON.stringify(ok));
}

// ─────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────

const mode = process.argv[2] || 'audit';

switch (mode) {
  case 'audit':
    runAudit(getPAT(process.argv)).catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;
  case 'anon':
    runAnon().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;
  case 'producao':
    runProducao().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;
  case 'keys':
    runKeys().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;
  case 'recon':
    runRecon(getPAT(process.argv)).catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;
  case 'backup':
    runBackup(getPAT(process.argv)).catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;
  case 'limpeza':
    runLimpeza(getPAT(process.argv)).catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;
  default:
    console.error(`❌ Modo desconhecido: ${mode}`);
    console.error('   Modos: audit (padrão), anon, producao, keys, recon <PAT>, backup <PAT>, limpeza <PAT>');
    process.exit(1);
}
