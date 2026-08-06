/**
 * Auditoria específica das migrations consolidadas vs banco real.
 *
 * Uso:
 *   node scripts/audit-migrations.mjs
 *
 * Verifica tabela por tabela, coluna por coluna, function por function,
 * e aponta o que está no banco vs o que está nas migrations.
 */

import { createClient } from '@supabase/supabase-js';
import { getAnonKey, getSupabaseUrl } from './lib/env-keys.mjs';

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getAnonKey();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(label, detail = '') {
  passed++;
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, detail = '') {
  failed++;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
}

function warn(label, detail = '') {
  warnings++;
  console.log(`  ⚠️  ${label}${detail ? ` — ${detail}` : ''}`);
}

function divider(title) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${title}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

async function main() {
  console.log(`\n🔍 AUDIT MIGRATIONS vs BANCO REAL`);
  console.log(`   Data: ${new Date().toISOString()}\n`);

  // ===================================================================
  // 1. SCHEMA — MIGRATION 001
  // ===================================================================
  divider('MIGRAÇÃO 001 — SCHEMA + RLS');

  // Tabelas principais
  const schemaTables = [
    'mensalista_plans', 'services', 'clients', 'bookings', 'settings',
    'push_subscriptions', 'audit_logs', 'gallery_images', 'whatsapp_templates',
    'booking_tokens', 'notifications', 'admin_users', 'testimonials',
    'rate_limits', 'coupons', 'loyalty_milestones', 'client_milestones', 'reminder_logs'
  ];

  for (const table of schemaTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) {
        if (error.code === '42P01') fail(table, 'Tabela NÃO existe no banco!');
        else warn(table, `Erro: ${error.message}`);
      } else {
        ok(table, `${count} registros`);
      }
    } catch (e) {
      fail(table, `Exceção: ${e.message}`);
    }
  }

  // Colunas críticas da 001
  divider('MIGRAÇÃO 001 — COLUNAS CRÍTICAS');

  const columnChecks = [
    { table: 'bookings', columns: 'id, client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, is_blocked, reminder_sent, notes, stats_preserved, no_show, coupon_id, discount_amount, barber_id' },
    { table: 'clients', columns: 'id, name, phone, email, notes, is_favorite, is_mensalista, mensalista_plan_id, mensalista_expires_at, is_blocked, manually_added, historical_visits, historical_spent, last_visit_date, deleted_at' },
    { table: 'services', columns: 'id, name, description, price, duration' },
    { table: 'settings', columns: 'key, value, updated_at' },
    { table: 'notifications', columns: 'id, user_id, title, body, tag, url, read, created_at' },
    { table: 'coupons', columns: 'id, code, description, discount_type, discount_value, valid_from, valid_until, max_uses, current_uses, is_active, applicable_service_ids' },
  ];

  for (const { table, columns } of columnChecks) {
    try {
      const colArr = columns.split(', ');
      const { error } = await supabase
        .from(table)
        .select(colArr.join(','))
        .limit(1);
      if (error) {
        fail(`${table} — colunas`, `Faltando: ${error.message}`);
      } else {
        ok(`${table} — colunas`, `${colArr.length} colunas OK`);
      }
    } catch (e) {
      fail(`${table} — colunas (exceção)`, e.message);
    }
  }

  // ===================================================================
  // 2. FUNCTIONS — MIGRATION 002
  // ===================================================================
  divider('MIGRAÇÃO 002 — FUNÇÕES + TRIGGERS');

  const rpcsToCheck = [
    'criar_agendamento',
    'criar_agendamento_rate_limited',
    'get_available_slots',
    'get_occupied_slots',
    'toggle_slot_block',
    'unblock_day',
    'get_bookings_by_token',
    'lookup_client_by_phone',
    'get_bookings_by_phone',
    'cancel_booking_public',
    'get_last_booking_by_phone',
    'is_admin',
    'check_rate_limit',
    'check_client_no_show_block',
    'completar_agendamentos_expirados',
    'health_check',
    'get_business_hours',
    'validate_coupon',
  ];

  for (const rpc of rpcsToCheck) {
    try {
      const { error } = await supabase.rpc(rpc, {});
      // Se o erro for sobre parâmetros, a função EXISTE (só chamamos com params errados)
      if (error && (error.message?.includes('function') && error.message?.includes('not found'))) {
        fail(rpc, 'Função NÃO existe no banco');
      } else if (error && error.message?.includes('parameter')) {
        ok(rpc, 'Existe (erro de parâmetro, esperado)');
      } else if (error && error.message?.includes('Acesso negado')) {
        ok(rpc, 'Existe (acesso negado para anon, esperado)');
      } else if (error) {
        warn(rpc, `Existe mas retornou: ${error.message.slice(0, 80)}`);
      } else {
        ok(rpc, 'Existe e retornou dados');
      }
    } catch (e) {
      warn(rpc, `Erro ao testar: ${e.message.slice(0, 80)}`);
    }
  }

  // ===================================================================
  // 3. SUBSCRIPTIONS + PIX — MIGRAÇÃO 006 (consolidada)
  // ===================================================================
  divider('MIGRAÇÃO 006 — ASSINATURAS + PIX + BLOQUEIO');

  // Tabelas
  const subTables = [
    { table: 'subscriptions', columns: 'id, barber_id, status, current_period_start, current_period_end, grace_period_end, asaas_customer_id, asaas_payment_id, auto_renew' },
    { table: 'payment_logs', columns: 'id, subscription_id, barber_id, asaas_payment_id, amount, status, payment_method, pix_qr_code, pix_payload, payment_link, paid_at, due_date' },
    { table: 'payment_blocked_users', columns: 'email, blocked_at, reason' },
  ];

  for (const { table, columns } of subTables) {
    try {
      const colArr = columns.split(', ');
      const { error } = await supabase
        .from(table)
        .select(colArr.join(','))
        .limit(1);
      if (error) {
        if (error.code === '42P01') fail(table, 'Tabela NÃO existe!');
        else if (error.message?.includes('permission')) ok(table, 'Existe (sem permissão de leitura)');
        else fail(table, `Erro: ${error.message}`);
      } else {
        ok(table, `${colArr.length} colunas OK`);
      }
    } catch (e) {
      if (e.message?.includes('relation') && e.message?.includes('does not exist')) {
        fail(table, 'Tabela NÃO existe!');
      } else {
        warn(table, `Erro: ${e.message.slice(0, 80)}`);
      }
    }
  }

  // Functions da 006
  const subRpcs = [
    { name: 'update_subscription_paid', params: { p_barber_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'check_subscription_status', params: { p_barber_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_payment_history', params: { p_barber_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'check_login_allowed', params: { p_email: 'teste@teste.com' } },
  ];

  for (const { name, params } of subRpcs) {
    try {
      const { error } = await supabase.rpc(name, params);
      if (error && error.message?.includes('function') && error.message?.includes('not found')) {
        fail(name, 'Função NÃO existe');
      } else {
        ok(name, 'Existe');
      }
    } catch (e) {
      warn(name, `Erro: ${e.message.slice(0, 80)}`);
    }
  }

  // Settings da 006 — PIX key
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'owner_pix_key')
      .maybeSingle();
    if (error) warn('settings.owner_pix_key', error.message);
    else if (data) ok('settings.owner_pix_key', data.value);
    else warn('settings.owner_pix_key', 'Não configurado');
  } catch (e) {
    warn('settings.owner_pix_key', e.message);
  }

  // ===================================================================
  // 4. FIX AGENDAMENTO — MIGRAÇÃO 007 (consolidada)
  // ===================================================================
  divider('MIGRAÇÃO 007 — FIX AGENDAMENTO + WRAPPER');

  // Verifica se o wrapper existe (assinatura com UUID primeiro)
  try {
    const { error } = await supabase.rpc('criar_agendamento_rate_limited', {
      p_barber_id: '00000000-0000-0000-0000-000000000000',
      p_cliente_email: 'test@test.com',
      p_cliente_nome: 'Teste',
      p_cliente_telefone: '11999999999',
      p_coupon_id: null,
      p_data: '2099-01-01',
      p_discount_amount: 0,
      p_duracao_total: 30,
      p_hora: '12:00',
      p_preco_total: 50,
      p_servicos: []
    });
    if (error && error.message?.includes('parameter')) {
      ok('criar_agendamento_rate_limited (wrapper UUID)', 'Existe');
    } else if (error && error.message?.includes('not found')) {
      fail('criar_agendamento_rate_limited (wrapper UUID)', 'NÃO existe');
    } else {
      ok('criar_agendamento_rate_limited (wrapper UUID)', 'Existe');
    }
  } catch (e) {
    fail('criar_agendamento_rate_limited (wrapper UUID)', e.message.slice(0, 80));
  }

  // ===================================================================
  // 5. BARBEIROS — TABELA EXTRA (não estava no audit original)
  // ===================================================================
  divider('TABELA BARBEIROS');

  try {
    const { data, error } = await supabase
      .from('barbers')
      .select('id, name, phone, photo_url, bio, quote, is_owner, is_active, sort_order, user_id')
      .limit(5);
    if (error) {
      if (error.code === '42P01') fail('barbers', 'Tabela NÃO existe!');
      else fail('barbers', error.message);
    } else {
      ok('barbers', `${data.length} barbeiros encontrados`);
      for (const b of data) {
        console.log(`       - ${b.name}${b.is_owner ? ' 👑 (dono)' : ''}${b.is_active ? '' : ' ❌ (inativo)'}`);
      }
    }
  } catch (e) {
    fail('barbers', e.message);
  }

  // ===================================================================
  // 6. RESULTADO FINAL
  // ===================================================================
  divider('📊 RESUMO MIGRATIONS vs BANCO');
  console.log(`   ✅ Passou: ${passed}`);
  console.log(`   ❌ Falhou: ${failed}`);
  console.log(`   ⚠️  Avisos: ${warnings}`);
  console.log(`   🎯 Total:   ${passed + failed + warnings}\n`);

  const allGreen = failed === 0 && warnings === 0;
  const hasFailures = failed > 0;

  if (hasFailures) {
    console.log('   🚨 EXISTEM FALHAS! Verifique a lista acima.\n');
    console.log('   🔧 Ação necessária:');
    if (failed > 0) console.log('      - Corrigir as colunas/funções faltantes no banco');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('   ⚠️  Tudo ok, mas há avisos.\n');
    process.exit(0);
  } else {
    console.log('   ✅ Tudo verde! Migrations consolidadas batem com o banco.\n');
    process.exit(0);
  }
}

main();
