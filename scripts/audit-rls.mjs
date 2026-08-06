/**
 * audit-rls.mjs (v4)
 * =========================================================================
 * Mapeia a EXPOSIÇÃO da chave ANON (pública) tabela por tabela.
 *
 * Veredito confiável:
 *   - SELECT: quantas linhas a anon consegue ver vs total real (service role).
 *   - INSERT: tenta inserir payload vazio `{}` — teste de escrita:
 *       • erro 42501 ("row-level security policy") → RLS bloqueia anon ✅
 *       • sucesso → tabela sem constraints e sem RLS 🚨
 *       • qualquer OUTRO erro (trigger/constraint, ex. P0001/23502) →
 *         INCONCLUSIVO ⚠️ — triggers BEFORE disparam ANTES da checagem RLS
 *         (WITH CHECK), então um erro de trigger NÃO prova que o RLS deixou
 *         passar. Confirme via SQL Editor: SELECT * FROM pg_policies
 *         WHERE tablename = '<tabela>';
 *   NOTA: NÃO usamos UPDATE/DELETE como veredito — o deny do RLS é silencioso
 *   (0 linhas sem erro), então daria falso "permitido".
 *
 * Uso: node scripts/audit-rls.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { getAnonKey, getServiceRoleKey, getSupabaseUrl } from './lib/env-keys.mjs';

const anon = createClient(getSupabaseUrl(), getAnonKey(), { auth: { persistSession: false } });
const admin = createClient(getSupabaseUrl(), getServiceRoleKey(), { auth: { persistSession: false } });

// Tabelas públicas por design (leitura liberada para anon é o esperado)
const PUBLIC_BY_DESIGN = new Set([
  'services',
  'settings',
  'barbers',
  'gallery_images',
  'testimonials',
  'mensalista_plans',
  'bookings', // leitura pública filtrada por status/data (design)
]);

const TABLES = [
  'bookings', 'clients', 'admin_users', 'audit_logs', 'notifications',
  'booking_tokens', 'push_subscriptions', 'subscriptions', 'payment_logs',
  'payment_blocked_users', 'rate_limits', 'reminder_logs', 'coupons',
  'loyalty_milestones', 'client_milestones', 'whatsapp_templates',
  'services', 'settings', 'barbers', 'barber_settings', 'gallery_images',
  'testimonials', 'mensalista_plans',
];

let readLeaks = 0;
let writeExposed = 0;

console.log(`\n🔓 AUDITORIA RLS v3 — exposição da chave ANON`);
console.log(`   Projeto: ${getSupabaseUrl()}`);
console.log(`   Data: ${new Date().toISOString()}\n`);

for (const table of TABLES) {
  // ── SELECT anon ──
  let anonRows = null;
  let anonErr = null;
  try {
    const { data, error } = await anon.from(table).select('*').limit(5);
    if (error) anonErr = error.message.slice(0, 45);
    else anonRows = data?.length ?? 0;
  } catch (e) {
    anonErr = e.message.slice(0, 45);
  }

  // ── Total real ──
  let total = null;
  try {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
    if (!error) total = count;
  } catch { /* ignora */ }

  // ── INSERT probe (veredito de escrita) ──
  // v4: erro de trigger/constraint NÃO prova permissão de escrita —
  // triggers BEFORE disparam antes da checagem RLS (WITH CHECK). Só conta
  // como "liberado" um INSERT que realmente SUCEDER; 42501 = RLS bloqueia;
  // qualquer outro erro = inconclusivo (verificar via pg_policies).
  let writeVerdict = '';
  try {
    const { error } = await anon.from(table).insert({});
    if (error) {
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        writeVerdict = 'RLS bloqueia';
      } else if (error.code === '42P01') {
        writeVerdict = '⚠️ tabela não existe (detalhe no SELECT acima)';
      } else {
        writeVerdict = `⚠️ inconclusivo (${error.code || '?'}: trigger/constraint pode mascarar RLS)`;
      }
    } else {
      writeVerdict = '🚨 INSERT SUCESSO (tabela sem constraints!)';
      writeExposed++;
    }
  } catch (e) {
    writeVerdict = `⚠️ inconclusivo (erro de execução: ${e.message.slice(0, 25)})`;
  }

  // ── Classificação de leitura ──
  let readVerdict;
  if (anonErr) {
    readVerdict = `SELECT bloqueado (${anonErr})`;
  } else if (anonRows > 0) {
    const flag = PUBLIC_BY_DESIGN.has(table) ? '(público por design)' : '🚨 VAZAMENTO';
    readVerdict = `SELECT vê ${anonRows}/${total ?? '?'} ${flag}`;
    if (!PUBLIC_BY_DESIGN.has(table)) readLeaks++;
  } else {
    readVerdict = `SELECT ok (vê 0/${total ?? '?'})`;
  }

  console.log(`  ${table.padEnd(22)} → ${readVerdict} | INSERT: ${writeVerdict}`);
}

console.log(`\n  ── RESUMO ──`);
console.log(`  🚨 Vazamento de leitura anon (fora das públicas por design): ${readLeaks}`);
console.log(`  🚨 Escrita anon liberada: ${writeExposed}\n`);
