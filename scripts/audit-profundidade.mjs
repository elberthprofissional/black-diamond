/**
 * audit-profundidade.mjs
 * =========================================================================
 * Auditoria profunda do banco via service_role (pg_catalog + information_schema).
 *
 * Verifica:
 *   1. Todas as tabelas do schema public + contagem de registros
 *   2. RLS habilitado por tabela (relrowsecurity / relforcerowsecurity)
 *   3. Policies RLS por tabela (pg_policies)
 *   4. Triggers por tabela (pg_trigger)
 *   5. Índices por tabela (pg_indexes)
 *   6. Funções (RPCs) no schema public (pg_proc)
 *   7. Cron jobs (cron.job, se exposto)
 *   8. Anomalias de dados (agendamentos no passado não finalizados, etc.)
 *
 * Uso:
 *   node scripts/audit-profundidade.mjs
 *
 * Requer no .env: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabaseUrl } from './lib/env-keys.mjs';

const sb = createClient(getSupabaseUrl(), getServiceRoleKey(), {
  auth: { persistSession: false },
});

let failed = 0;
const fail = (label, detail) => {
  failed++;
  console.log(`  ❌ ${label} — ${detail}`);
};
const ok = (label, detail = '') => console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
const warn = (label, detail = '') => console.log(`  ⚠️  ${label} — ${detail}`);

function divider(title) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${title}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

async function query(schema, table, select, filters = {}) {
  try {
    let q = sb.schema(schema).from(table).select(select);
    for (const [k, v] of Object.entries(filters)) {
      q = q.eq(k, v);
    }
    const { data, error } = await q;
    return { data, error };
  } catch (e) {
    return { data: null, error: { message: e.message, code: 'EXCEPTION' } };
  }
}

async function main() {
  console.log(`\n🔬 AUDITORIA PROFUNDA — ${getSupabaseUrl()}`);
  console.log(`   Data: ${new Date().toISOString()}\n`);

  // ===================================================================
  // 1. TABELAS + RLS
  // ===================================================================
  divider('1. TABELAS DO SCHEMA PUBLIC + STATUS RLS');

  const { data: rels, error: eRels } = await query('pg_catalog', 'pg_class', 'relname,relrowsecurity,relforcerowsecurity', { relkind: 'r' });

  if (eRels && eRels.code === 'PGRST106') {
    console.log('  ⚠️  pg_catalog não exposto via REST — vou usar informação limitada\n');
  } else if (eRels) {
    console.log(`  ⚠️  pg_class: ${eRels.message}\n`);
  }

  const publicTables = [
    'admin_users', 'audit_logs', 'barbers', 'booking_tokens', 'bookings',
    'client_milestones', 'clients', 'coupons', 'gallery_images',
    'loyalty_milestones', 'mensalista_plans', 'notifications', 'payment_blocked_users',
    'payment_logs', 'push_subscriptions', 'rate_limits', 'reminder_logs',
    'services', 'settings', 'subscriptions', 'testimonials', 'whatsapp_templates',
  ];

  if (rels) {
    const rlsOff = rels.filter((r) => !r.relrowsecurity);
    const rlsOn = rels.filter((r) => r.relrowsecurity);
    console.log(`  Tabelas no banco: ${rels.length}`);
    console.log(`  ✅ RLS HABILITADO: ${rlsOn.length} tabelas`);
    console.log(`     ${rlsOn.map((r) => r.relname).sort().join(', ')}`);
    if (rlsOff.length) {
      console.log(`  🚨 RLS DESABILITADO (risco!): ${rlsOff.length}`);
      for (const r of rlsOff) console.log(`     - ${r.relname}`);
    }
  }

  // ===================================================================
  // 2. POLICIES RLS POR TABELA
  // ===================================================================
  divider('2. POLICIES RLS (pg_policies)');

  const { data: policies, error: ePol } = await query('pg_catalog', 'pg_policies', 'schemaname,tablename,polname,polcmd,polroles');
  if (ePol) {
    console.log(`  ⚠️  pg_policies: ${ePol.message}`);
  } else if (policies) {
    console.log(`  Total de policies: ${policies.length}`);
    const byTable = {};
    for (const p of policies) {
      if (!byTable[p.tablename]) byTable[p.tablename] = [];
      byTable[p.tablename].push(`${p.polname}(${p.polcmd})`);
    }
    for (const [t, pols] of Object.entries(byTable).sort()) {
      console.log(`  ${t}: ${pols.join(', ')}`);
    }
    // tabelas do app sem policy alguma
    for (const t of publicTables) {
      if (!byTable[t]) warn(`Sem policy alguma`, t);
    }
  }

  // ===================================================================
  // 3. TRIGGERS
  // ===================================================================
  divider('3. TRIGGERS (pg_trigger)');

  const { data: triggers, error: eTrig } = await query('pg_catalog', 'pg_trigger', 'tgname,relname', { tgisinternal: false });
  if (eTrig) {
    console.log(`  ⚠️  pg_trigger: ${eTrig.message}`);
  } else if (triggers) {
    console.log(`  Triggers (não-internas): ${triggers.length}`);
    for (const t of triggers) console.log(`     - ${t.tgname} → ${t.relname}`);
  }

  // ===================================================================
  // 4. ÍNDICES
  // ===================================================================
  divider('4. ÍNDICES (pg_indexes)');

  const { data: indexes, error: eIdx } = await query('pg_catalog', 'pg_indexes', 'tablename,indexname,indexdef', { schemaname: 'public' });
  if (eIdx) {
    console.log(`  ⚠️  pg_indexes: ${eIdx.message}`);
  } else if (indexes) {
    console.log(`  Índices no schema public: ${indexes.length}`);
    for (const i of indexes) console.log(`     - ${i.tablename}: ${i.indexname}`);
  }

  // ===================================================================
  // 5. FUNÇÕES RPC
  // ===================================================================
  divider('5. FUNÇÕES (pg_proc, schema public)');

  const { data: fns, error: eFn } = await query('pg_catalog', 'pg_proc', 'proname,proretset', { pronamespace: '(SELECT oid FROM pg_namespace WHERE nspname = \'public\')' });
  if (eFn) {
    console.log(`  ⚠️  pg_proc: ${eFn.message}`);
  } else if (fns) {
    const names = fns.map((f) => f.proname).sort();
    console.log(`  Funções: ${names.length}`);
    console.log(`     ${names.join(', ')}`);
  }

  // ===================================================================
  // 6. CRON JOBS (se exposto)
  // ===================================================================
  divider('6. CRON JOBS (cron.job)');

  const { data: cronJobs, error: eCron } = await query('cron', 'job', 'jobid,jobname,schedule,active');
  if (eCron) {
    console.log(`  ⚠️  cron schema não exposto via REST (${eCron.message?.slice(0, 60)})`);
  } else if (cronJobs) {
    for (const j of cronJobs) console.log(`     - [${j.jobid}] ${j.jobname} | ${j.schedule} | ativo=${j.active}`);
  }

  // ===================================================================
  // 7. ANOMALIAS DE DADOS
  // ===================================================================
  divider('7. ANOMALIAS DE DADOS');

  // Bookings no passado ainda abertos (não completed/cancelled)
  const { data: staleBookings, error: eSb } = await sb
    .from('bookings')
    .select('id,booking_date,booking_time,status,clients(name)')
    .lt('booking_date', '2026-07-25')
    .not('status', 'in', '("completed","cancelled")')
    .limit(20);
  if (eSb) warn('bookings passados abertos', eSb.message);
  else if (staleBookings?.length) {
    failed++;
    console.log(`  🚨 ${staleBookings.length} booking(s) no passado com status aberto:`);
    for (const b of staleBookings) console.log(`     - ${b.booking_date} ${b.booking_time} [${b.status}] ${b.clients?.name || 'sem cliente'}`);
  } else ok('bookings passados', 'nenhum agendamento aberto no passado');

  // Clientes duplicados por telefone
  const { data: clients, error: eCl } = await sb.from('clients').select('id,name,phone,deleted_at');
  if (eCl) warn('clientes', eCl.message);
  else {
    const active = clients.filter((c) => !c.deleted_at);
    const byPhone = {};
    for (const c of active) {
      const p = c.phone?.replace(/\D/g, '');
      if (!byPhone[p]) byPhone[p] = [];
      byPhone[p].push(c.name);
    }
    const dups = Object.entries(byPhone).filter(([, v]) => v.length > 1);
    if (dups.length) {
      warn('clientes duplicados por telefone', dups.map(([p, n]) => `${p} (${n.join(', ')})`).join(' | '));
    } else ok('clientes', `${active.length} ativos, sem duplicatas por telefone`);
  }

  // Bookings sem cliente
  const { data: orphans, error: eOr } = await sb.from('bookings').select('id,booking_date,status,client_id').is('client_id', null).limit(10);
  if (eOr) warn('bookings órfãos', eOr.message);
  else if (orphans?.length) {
    warn('bookings sem client_id', `${orphans.length} encontrados`);
  } else ok('bookings', 'nenhum booking órfão');

  // Assinaturas e pagamentos
  const { data: subs, error: eSub } = await sb.from('subscriptions').select('*');
  if (eSub) warn('subscriptions', eSub.message);
  else if (!subs?.length) warn('subscriptions', 'nenhuma assinatura registrada (verificar se esperado)');
  else {
    for (const s of subs) console.log(`     assinatura: status=${s.status} período=${s.current_period_start?.slice(0, 10)} → ${s.current_period_end?.slice(0, 10)}`);
  }

  const { data: payments, error: ePay } = await sb.from('payment_logs').select('id,amount,status,due_date,paid_at').limit(10);
  if (ePay) warn('payment_logs', ePay.message);
  else if (payments?.length) {
    console.log(`  payment_logs: ${payments.length} (amostra)`);
    for (const p of payments) console.log(`     R$ ${p.amount} [${p.status}] vencimento=${p.due_date?.slice(0, 10)} pago=${p.paid_at?.slice(0, 10) || '—'}`);
  } else console.log('  payment_logs: nenhum pagamento registrado');

  // Bookings com barber_id nulo (legado)
  const { data: noBarber, error: eNb } = await sb.from('bookings').select('id,booking_date').is('barber_id', null).limit(5);
  if (!eNb && noBarber?.length) warn('bookings sem barber_id', `${noBarber.length} encontrados (legado) — consulta de slots já considera todos`);

  // ===================================================================
  // RESUMO
  // ===================================================================
  divider('📊 RESUMO AUDITORIA PROFUNDA');
  console.log(`   ${failed === 0 ? '✅ Sem anomalias críticas de dados' : `🚨 ${failed} anomalia(s) encontrada(s)`}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
