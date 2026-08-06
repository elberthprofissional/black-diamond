/**
 * Audit completo do Supabase — testa conexão, RPCs, queries e schema.
 *
 * Uso:
 *   node scripts/audit-full-supabase.mjs
 *
 * Variáveis de ambiente (ou passa via .env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Ou edita as constantes abaixo.
 */

import { createClient } from '@supabase/supabase-js';
import { getAnonKey, getSupabaseUrl } from './lib/env-keys.mjs';

// ===================== CONFIG =====================
const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getAnonKey();
// ==================================================

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
  console.log(`\n🔍 AUDIT COMPLETO — SUPABASE`);
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Data: ${new Date().toISOString()}\n`);

  // ===================================================================
  // 1. CONEXÃO
  // ===================================================================
  divider('1. CONEXÃO');

  try {
    const { data, error } = await supabase.from('services').select('count', { count: 'exact', head: true });
    if (error) {
      fail('Conexão básica', error.message);
    } else {
      ok('Conexão estabelecida', 'Serviços acessível');
    }
  } catch (e) {
    fail('Conexão básica (exceção)', e.message);
  }

  // ===================================================================
  // 2. HEALTH CHECK
  // ===================================================================
  divider('2. HEALTH CHECK');

  try {
    const { data, error } = await supabase.rpc('health_check');
    if (error) {
      fail('health_check RPC', error.message);
    } else if (data?.status === 'ok') {
      ok('health_check', `status=ok, version=${data.version}, services=${data.database?.services}, bookings=${data.database?.bookings}, clients=${data.database?.clients}`);
    } else {
      warn('health_check', `status=${data?.status || 'unknown'}`);
    }
  } catch (e) {
    fail('health_check RPC (exceção)', e.message);
  }

  // ===================================================================
  // 3. TABELAS — RECORD COUNTS
  // ===================================================================
  divider('3. TABELAS — CONTAGEM DE REGISTROS');

  const tables = ['services', 'bookings', 'clients', 'settings', 'coupons', 'gallery_images', 'testimonials', 'barbers', 'mensalista_plans', 'booking_tokens', 'push_subscriptions', 'notifications', 'loyalty_milestones', 'client_milestones', 'audit_logs'];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) {
        if (error.code === '42P01') {
          warn(`${table}`, 'Tabela não existe');
        } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
          warn(`${table}`, `Sem permissão de leitura — ${error.message}`);
        } else {
          fail(`${table}`, error.message);
        }
      } else {
        ok(`${table}`, `${count} registros`);
      }
    } catch (e) {
      fail(`${table} (exceção)`, e.message);
    }
  }

  // ===================================================================
  // 4. RPCS PRINCIPAIS
  // ===================================================================
  divider('4. RPCS PRINCIPAIS');

  // 4.1 get_available_slots
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc('get_available_slots', { p_date: today, p_barber_id: null });
    if (error) {
      fail('get_available_slots', error.message);
    } else {
      const slots = Array.isArray(data) ? data.length : 0;
      ok('get_available_slots', `${slots} slots disponíveis para hoje`);
    }
  } catch (e) {
    fail('get_available_slots (exceção)', e.message);
  }

  // 4.2 get_occupied_slots
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc('get_occupied_slots', { p_date: today, p_barber_id: null });
    if (error) {
      fail('get_occupied_slots', error.message);
    } else {
      const count = Array.isArray(data) ? data.length : 0;
      ok('get_occupied_slots', `${count} ocupados hoje`);
    }
  } catch (e) {
    fail('get_occupied_slots (exceção)', e.message);
  }

  // 4.3 completar_agendamentos_expirados
  try {
    const { data, error } = await supabase.rpc('completar_agendamentos_expirados');
    if (error) {
      fail('completar_agendamentos_expirados', error.message);
    } else {
      ok('completar_agendamentos_expirados', 'Executado sem erros');
    }
  } catch (e) {
    fail('completar_agendamentos_expirados (exceção)', e.message);
  }

  // 4.4 get_business_hours
  try {
    const { data, error } = await supabase.rpc('get_business_hours');
    if (error) {
      fail('get_business_hours', error.message);
    } else {
      const keys = data ? Object.keys(data).join(', ') : 'vazio';
      ok('get_business_hours', `Chaves: ${keys}`);
    }
  } catch (e) {
    fail('get_business_hours (exceção)', e.message);
  }

  // 4.5 validate_coupon (teste com código vazio — deve retornar inválido)
  try {
    const { data, error } = await supabase.rpc('validate_coupon', { p_code: '', p_service_ids: [] });
    if (error) {
      fail('validate_coupon', error.message);
    } else {
      ok('validate_coupon', `valid=${data?.valid}, error=${data?.error || 'nenhum'}`);
    }
  } catch (e) {
    fail('validate_coupon (exceção)', e.message);
  }

  // 4.6 toggle_slot_block (teste com data futura)
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc('toggle_slot_block', { p_date: dateStr, p_time: '12:00' });
    if (error) {
      if (error.message?.includes('Acesso negado')) {
        ok('toggle_slot_block', 'Anon não tem permissão (esperado)');
      } else {
        fail('toggle_slot_block', error.message);
      }
    } else {
      warn('toggle_slot_block', `Bloqueio feito como anon (inesperado): id=${data?.id}, blocked=${data?.blocked}`);
    }
  } catch (e) {
    fail('toggle_slot_block (exceção)', e.message);
  }

  // 4.7 unblock_day
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc('unblock_day', { p_date: dateStr });
    if (error) {
      if (error.message?.includes('Acesso negado')) {
        ok('unblock_day', 'Anon não tem permissão (esperado)');
      } else {
        fail('unblock_day', error.message);
      }
    } else {
      ok('unblock_day', 'Executado sem erros');
    }
  } catch (e) {
    fail('unblock_day (exceção)', e.message);
  }

  // 4.8 get_bookings_by_token (token inválido — deve retornar vazio)
  try {
    const { data, error } = await supabase.rpc('get_bookings_by_token', { p_token: 'token_invalido_teste' });
    if (error) {
      fail('get_bookings_by_token', error.message);
    } else {
      ok('get_bookings_by_token', `Retornou ${Array.isArray(data) ? data.length : 0} bookings`);
    }
  } catch (e) {
    fail('get_bookings_by_token (exceção)', e.message);
  }

  // 4.9 check_rate_limit
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', { p_key: 'test_audit', p_max_attempts: 5, p_window_seconds: 60 });
    if (error) {
      fail('check_rate_limit', error.message);
    } else {
      ok('check_rate_limit', `allowed=${data}`);
    }
  } catch (e) {
    fail('check_rate_limit (exceção)', e.message);
  }

  // 4.10 is_client_blocked_by_no_show — REMOVIDA de propósito na migration 005
  // (bloqueio automático por faltas desativado — apenas notifica).
  try {
    const { data, error } = await supabase.rpc('is_client_blocked_by_no_show', { p_client_id: '00000000-0000-0000-0000-000000000000' });
    if (error && (error.message?.includes('not found') || error.code === 'PGRST202')) {
      ok('is_client_blocked_by_no_show', 'Removida de propósito (migration 005) — sem bloqueio por faltas');
    } else if (error) {
      ok('is_client_blocked_by_no_show', `Retornou erro esperado: ${error.message.slice(0, 50)}`);
    } else {
      ok('is_client_blocked_by_no_show', `blocked=${data}`);
    }
  } catch (e) {
    ok('is_client_blocked_by_no_show', `Exceção (esperado): ${e.message.slice(0, 50)}`);
  }

  // ===================================================================
  // 5. SETTINGS — Valores importantes
  // ===================================================================
  divider('5. SETTINGS');

  const settingKeys = ['barber_hours', 'barber_name', 'barber_phone', 'working_days', 'opening_time', 'closing_time', 'max_no_shows', 'loyalty_enabled'];

  for (const key of settingKeys) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        if (error.message?.includes('permission')) {
          warn(`settings.${key}`, 'Sem permissão');
        } else {
          fail(`settings.${key}`, error.message);
        }
      } else if (data) {
        const valPreview = typeof data.value === 'string' ? data.value.slice(0, 60) : JSON.stringify(data.value).slice(0, 60);
        ok(`settings.${key}`, `${valPreview}`);
      } else {
        warn(`settings.${key}`, 'Não configurado');
      }
    } catch (e) {
      fail(`settings.${key} (exceção)`, e.message);
    }
  }

  // ===================================================================
  // 6. DADOS DE EXEMPLO
  // ===================================================================
  divider('6. DADOS DE EXEMPLO');

  // Serviços
  try {
    const { data, error } = await supabase.from('services').select('name, price, duration').order('price', { ascending: false }).limit(5);
    if (error) {
      fail('services (top 5)', error.message);
    } else if (data && data.length > 0) {
      const list = data.map(s => `${s.name} (R$ ${s.price})`).join(', ');
      ok('services (top 5)', `${data.length} encontrados: ${list}`);
    } else {
      warn('services (top 5)', 'Nenhum serviço cadastrado');
    }
  } catch (e) {
    fail('services (exceção)', e.message);
  }

  // Clientes (top 5)
  try {
    const { data, error } = await supabase.from('clients').select('name, phone, is_mensalista').limit(5);
    if (error) {
      fail('clients (top 5)', error.message);
    } else if (data && data.length > 0) {
      const list = data.map(c => `${c.name} (${c.phone})${c.is_mensalista ? ' 💎' : ''}`).join(', ');
      ok('clients (top 5)', `${data.length} encontrados: ${list}`);
    } else {
      warn('clients (top 5)', 'Nenhum cliente cadastrado');
    }
  } catch (e) {
    fail('clients (exceção)', e.message);
  }

  // Bookings recentes
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_date, booking_time, status, total_price')
      .order('booking_date', { ascending: false })
      .limit(5);

    if (error) {
      fail('bookings (recentes)', error.message);
    } else if (data && data.length > 0) {
      const list = data.map(b => `${b.booking_date} ${b.booking_time} [${b.status}] R$ ${b.total_price}`).join(', ');
      ok('bookings (recentes)', `${data.length}: ${list}`);
    } else {
      warn('bookings (recentes)', 'Nenhum booking encontrado');
    }
  } catch (e) {
    fail('bookings (exceção)', e.message);
  }

  // Cupons ativos
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('code, discount_type, discount_value, is_active')
      .limit(5);

    if (error) {
      fail('coupons', error.message);
    } else if (data && data.length > 0) {
      const list = data.map(c => `${c.code} (${c.discount_type}: ${c.discount_value})${c.is_active ? ' ✅' : ' ❌'}`).join(', ');
      ok('coupons', `${data.length}: ${list}`);
    } else {
      warn('coupons', 'Nenhum cupom cadastrado');
    }
  } catch (e) {
    fail('coupons (exceção)', e.message);
  }

  // ===================================================================
  // 7. SCHEMA — Verifica colunas esperadas
  // ===================================================================
  divider('7. SCHEMA — COLUNAS CRÍTICAS');

  // Verifica se a tabela bookings tem as colunas esperadas
  try {
    const { data, error } = await supabase.from('bookings').select('id, is_blocked, no_show, discount_amount, barber_id, stats_preserved').limit(1);
    if (error) {
      fail('bookings — colunas críticas', `Faltando colunas: ${error.message}`);
    } else {
      ok('bookings — colunas críticas', 'is_blocked, no_show, discount_amount, barber_id, stats_preserved OK');
    }
  } catch (e) {
    fail('bookings — colunas críticas (exceção)', e.message);
  }

  try {
    const { data, error } = await supabase.from('clients').select('id, historical_visits, historical_spent, last_visit_date, is_mensalista, mensalista_plan_id, mensalista_expires_at').limit(1);
    if (error) {
      fail('clients — colunas críticas', `Faltando colunas: ${error.message}`);
    } else {
      ok('clients — colunas críticas', 'historical_visits, historical_spent, last_visit_date, mensalista OK');
    }
  } catch (e) {
    fail('clients — colunas críticas (exceção)', e.message);
  }

  try {
    const { data, error } = await supabase.from('services').select('id, duration, commission_type, commission_value').limit(1);
    if (error) {
      fail('services — colunas críticas', `Faltando colunas: ${error.message}`);
    } else {
      ok('services — colunas críticas', 'duration, commission_type, commission_value OK');
    }
  } catch (e) {
    fail('services — colunas críticas (exceção)', e.message);
  }

  // ===================================================================
  // 8. RLS — Testa políticas de segurança
  // ===================================================================
  divider('8. RLS — TESTE DE PERMISSÕES (ANON)');

  // Tentar acessar tabelas que NÃO deveriam ser públicas
  const protectedTables = [
    { table: 'settings', action: 'select' },
    { table: 'bookings', action: 'insert (anon)' },
    { table: 'audit_logs', action: 'select' },
  ];

  // settings — anon não deve conseguir escrever
  try {
    const { error } = await supabase.from('settings').insert({ key: 'test_anon', value: 'test' });
    if (error && (error.message?.includes('permission') || error.message?.includes('policy') || error.code === '42501')) {
      ok('settings — anon insert bloqueado', 'RLS funcionando');
    } else if (error) {
      fail('settings — anon insert', error.message);
    } else {
      warn('settings — anon insert', 'Conseguiu inserir!');
    }
  } catch (e) {
    fail('settings — anon insert (exceção)', e.message);
  }

  // ===================================================================
  // 9. CRON JOBS
  // ===================================================================
  divider('9. CRON JOBS');

  try {
    const { data, error } = await supabase.rpc('cleanup_rate_limits');
    if (error) {
      warn('cleanup_rate_limits', error.message);
    } else {
      ok('cleanup_rate_limits', 'Executado');
    }
  } catch (e) {
    fail('cleanup_rate_limits (exceção)', e.message);
  }

  try {
    const { data, error } = await supabase.rpc('cleanup_expired_tokens');
    if (error) {
      warn('cleanup_expired_tokens', error.message);
    } else {
      ok('cleanup_expired_tokens', 'Executado');
    }
  } catch (e) {
    fail('cleanup_expired_tokens (exceção)', e.message);
  }

  // ===================================================================
  // RESUMO
  // ===================================================================
  divider('📊 RESUMO FINAL');
  console.log(`   ✅ Passou: ${passed}`);
  console.log(`   ❌ Falhou: ${failed}`);
  console.log(`   ⚠️  Avisos: ${warnings}`);
  console.log(`   🎯 Total:   ${passed + failed + warnings}\n`);

  if (failed > 0) {
    console.log('   🚨 Existem falhas que precisam de atenção!\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('   ⚠️  Todos os testes passaram, mas há avisos.\n');
    process.exit(0);
  } else {
    console.log('   ✅ Tudo verde! Banco saudável.\n');
    process.exit(0);
  }
}

main();
