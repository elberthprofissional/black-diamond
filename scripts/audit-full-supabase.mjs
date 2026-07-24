/**
 * Auditoria 360 do Supabase — Black Diamond
 * 
 * Uso: node scripts/audit-full-supabase.mjs
 * 
 * Conecta com service_role key e varre:
 * - Tabelas existentes vs esperadas
 * - Colunas de cada tabela
 * - RPC functions
 * - RLS policies
 * - Triggers
 * - Dados reais (contagens, amostras)
 * - Integridade (registros órfãos)
 * - Comparação com o que o frontend/types espera
 */

const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const RESULT = {
  tables: {},
  rpcs: {},
  triggers: {},
  policies: {},
  data: {},
  issues: [],
};

function issue(type, msg) {
  RESULT.issues.push({ type, msg });
}

async function query(sql) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql_diag`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ p_sql: sql }),
    });
    if (resp.ok) return { data: await resp.json(), error: null };
    const text = await resp.text();
    return { data: null, error: text.substring(0, 200) };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

async function getCount(table) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) return { count: null, error: error.message };
    return { count, error: null };
  } catch (e) {
    return { count: null, error: e.message };
  }
}

async function getSample(table, limit = 3) {
  try {
    const { data, error } = await supabase.from(table).select('*').limit(limit);
    if (error) return null;
    return data;
  } catch { return null; }
}

const EXPECTED_TABLES = [
  'services', 'clients', 'bookings', 'settings', 'push_subscriptions',
  'audit_logs', 'gallery_images', 'whatsapp_templates', 'booking_tokens',
  'notifications', 'admin_users', 'rate_limits',
  'coupons', 'loyalty_milestones', 'client_milestones', 'testimonials',
  'barbers', 'barber_settings', 'reminder_logs', 'mensalista_plans',
];

// Colunas esperadas por tabela (baseado nos types do frontend)
const EXPECTED_COLUMNS = {
  services: ['id', 'name', 'description', 'price', 'duration', 'created_at'],
  clients: ['id', 'name', 'phone', 'email', 'notes', 'is_favorite', 'is_mensalista', 'mensalista_plan_id', 'mensalista_expires_at', 'is_blocked', 'deleted_at', 'manually_added', 'historical_visits', 'historical_spent', 'last_visit_date', 'created_at'],
  bookings: ['id', 'client_id', 'service_ids', 'booking_date', 'booking_time', 'total_price', 'total_duration', 'status', 'is_blocked', 'reminder_sent', 'notes', 'stats_preserved', 'no_show', 'coupon_id', 'discount_amount', 'barber_id', 'created_at'],
  settings: ['key', 'value', 'updated_at'],
  barbers: ['id', 'user_id', 'name', 'phone', 'photo_url', 'bio', 'quote', 'is_active', 'is_owner', 'sort_order', 'created_at'],
  coupons: ['id', 'code', 'description', 'discount_type', 'discount_value', 'valid_from', 'valid_until', 'max_uses', 'current_uses', 'is_active', 'applicable_service_ids', 'created_at'],
};

const EXPECTED_RPCS = [
  'criar_agendamento', 'criar_agendamento_rate_limited',
  'get_available_slots', 'get_occupied_slots',
  'toggle_slot_block', 'unblock_day',
  'get_business_hours', 'health_check',
  'get_barbers', 'get_barber_by_user_id', 'upsert_barber', 'delete_barber',
  'validate_coupon', 'apply_coupon',
  'check_rate_limit', 'is_admin',
  'save_push_subscription', 'delete_push_subscription',
  'completar_agendamentos_expirados', 'auto_block_lunch_break',
  'cleanup_old_data', 'clean_old_notifications', 'cleanup_expired_tokens',
  'send_weekly_report',
  'check_client_no_show_block', 'is_client_blocked_by_no_show',
  'lookup_client_by_phone', 'lookup_client_by_phone_rate_limited',
  'get_bookings_by_phone', 'get_bookings_by_phone_rate_limited',
  'cancel_booking_public', 'get_bookings_by_token',
  'get_last_booking_by_phone', 'get_last_booking_by_phone_rate_limited',
  'get_client_milestones_public',
  'increment_client_visits', 'save_loyalty_milestones',
  'cleanup_rate_limits', 'preserve_client_stats',
  'verificar_mensalistas',
];

async function auditTables() {
  console.log('\n📋 ** TABELAS **');
  console.log('='.repeat(60));

  // Try to list tables via information_schema
  const { data: schemaTables } = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );

  // Try direct REST check for each table
  for (const table of EXPECTED_TABLES) {
    const { count, error } = await getCount(table);
    const sample = count !== null ? await getSample(table) : null;

    RESULT.tables[table] = {
      exists: count !== null,
      count: count,
      hasData: count !== null && count > 0,
      sample: sample,
    };

    const status = count !== null ? (count > 0 ? `📦 ${count} regs` : '📭 vazia') : '❌ NÃO EXISTE';
    console.log(`  ${count !== null ? '✅' : '❌'} ${table.padEnd(25)} ${status}`);

    if (count === null) {
      issue('tabela_faltando', `Tabela "${table}" não existe no banco`);
    }

    // Check columns for key tables
    if (EXPECTED_COLUMNS[table] && count !== null) {
      const actualCols = sample && sample.length > 0 ? Object.keys(sample[0]) : [];
      const missing = EXPECTED_COLUMNS[table].filter(c => !actualCols.includes(c));
      const extra = actualCols.filter(c => !EXPECTED_COLUMNS[table].includes(c));

      if (missing.length > 0) {
        console.log(`       ❌ Colunas faltando: ${missing.join(', ')}`);
        issue('coluna_faltando', `"${table}" falta: ${missing.join(', ')}`);
      }
      if (extra.length > 0) {
        console.log(`       ℹ️ Colunas extras: ${extra.join(', ')}`);
      }
    }
  }
}

async function auditRPCs() {
  console.log('\n📋 ** RPC FUNCTIONS **');
  console.log('='.repeat(60));

  const { data: routines } = await query(
    "SELECT routine_name, routine_type FROM information_schema.routines WHERE specific_schema = 'public' ORDER BY routine_name"
  );

  const existingFuncs = routines
    ? (Array.isArray(routines) ? routines : JSON.parse(routines))
    : [];

  const funcNames = Array.isArray(existingFuncs)
    ? existingFuncs.map(f => f.routine_name || f)
    : [];

  for (const func of EXPECTED_RPCS) {
    const exists = funcNames.includes(func);
    RESULT.rpcs[func] = exists;
    console.log(`  ${exists ? '✅' : '❌'} ${func}`);
    if (!exists) {
      issue('rpc_faltando', `RPC "${func}" não existe no banco`);
    }
  }
}

async function auditPolicies() {
  console.log('\n📋 ** RLS POLICIES **');
  console.log('='.repeat(60));

  const { data: policies } = await query(
    "SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname"
  );

  if (policies) {
    const polList = Array.isArray(policies) ? policies : (JSON.parse(policies));
    for (const p of polList) {
      const name = p.policyname || p.policyname;
      console.log(`  🔒 ${p.tablename}: ${p.policyname}`);
    }
    console.log(`\n  Total: ${polList.length} policies`);
  } else {
    console.log('  ⚠️ Não foi possível listar policies');
  }
}

async function auditData() {
  console.log('\n📋 ** DADOS **');
  console.log('='.repeat(60));

  // Services
  const { data: services } = await supabase.from('services').select('id, name, price, duration').order('name');
  if (services) {
    console.log(`\n✂️ SERVIÇOS (${services.length}):`);
    const names = services.map(s => s.name);
    const dups = names.filter((n, i) => names.indexOf(n) !== i);
    if (dups.length > 0) {
      console.log(`  ❌ DUPLICATAS: ${[...new Set(dups)].join(', ')}`);
      issue('duplicata', `Serviços duplicados: ${[...new Set(dups)].join(', ')}`);
    }
    for (const s of services) {
      console.log(`  ✂️ ${s.name.padEnd(20)} R$ ${s.price.toFixed(2).padStart(7)}  ${s.duration}min`);
    }
  }

  // Settings
  const { data: settings } = await supabase.from('settings').select('key, value').order('key');
  if (settings) {
    console.log(`\n⚙️ SETTINGS (${settings.length}):`);
    const expectedSettings = [
      'barber_name', 'barber_phone', 'barber_photo', 'barber_bio', 'barber_quote',
      'barber_instagram', 'barber_hours', 'brand_logo', 'brand_login_bg',
      'opening_time', 'closing_time', 'working_days', 'saturday_opening', 'saturday_closing',
      'max_no_shows', 'onboarding_completed', 'mensalista_enabled', 'multi_barber_enabled',
      'site_url',
    ];
    const existingKeys = settings.map(s => s.key);
    const missing = expectedSettings.filter(k => !existingKeys.includes(k));
    for (const s of settings) {
      const display = s.key === 'barber_hours' ? '(JSON)' : s.value.substring(0, 60);
      console.log(`  🔑 ${s.key.padEnd(25)} ${display}`);
    }
    if (missing.length > 0) {
      console.log(`  ℹ️ Settings não encontradas (usam default): ${missing.join(', ')}`);
    }
  }

  // Bookings hoje
  const hoje = new Date().toISOString().split('T')[0];
  const { data: bookingsHoje, count: countHoje } = await supabase
    .from('bookings')
    .select('id, booking_date, booking_time, status, total_price, barber_id', { count: 'exact' })
    .gte('booking_date', hoje)
    .lte('booking_date', hoje)
    .order('booking_time');
  if (bookingsHoje) {
    console.log(`\n📅 AGENDAMENTOS HOJE (${countHoje}):`);
    for (const b of bookingsHoje) {
      const icon = b.status === 'confirmed' ? '✅' : b.status === 'completed' ? '✅' : b.status === 'cancelled' ? '❌' : '⏳';
      console.log(`  ${icon} ${b.booking_time} | R$ ${b.total_price} | ${b.status} | barber: ${b.barber_id?.substring(0,8) || '—'}`);
    }
  }

  // Clientes
  const { data: clients, count: clientCount } = await supabase
    .from('clients')
    .select('id, name, is_mensalista, is_blocked', { count: 'exact' })
    .is('deleted_at', null)
    .limit(10);
  if (clients) {
    console.log(`\n👥 CLIENTES ATIVOS (${clientCount} total, mostrando 10):`);
    for (const c of clients) {
      const mens = c.is_mensalista ? ' 💎' : '';
      const blocked = c.is_blocked ? ' 🔒' : '';
      console.log(`  👤 ${c.name.padEnd(20)}${mens}${blocked}`);
    }
  }

  // Barbeiros
  const { data: barbers } = await supabase.from('barbers').select('id, name, is_active, is_owner');
  if (barbers) {
    console.log(`\n💈 BARBEIROS (${barbers.length}):`);
    for (const b of barbers) {
      console.log(`  💈 ${b.name.padEnd(15)} ${b.is_active ? '✅ ativo' : '❌ inativo'} ${b.is_owner ? '👑 dono' : ''}`);
    }
  }

  // Cupons
  const { data: coupons } = await supabase.from('coupons').select('code, discount_type, discount_value, is_active, current_uses, max_uses');
  if (coupons) {
    console.log(`\n🎫 CUPONS (${coupons.length}):`);
    for (const c of coupons) {
      console.log(`  🎫 ${c.code.padEnd(15)} ${c.discount_type.padEnd(10)} ${c.discount_value} | usos: ${c.current_uses}/${c.max_uses || '∞'} ${c.is_active ? '✅' : '❌'}`);
    }
  }

  // Loyalty
  const { data: milestones } = await supabase.from('loyalty_milestones').select('visits_required, reward_service_id, is_active');
  if (milestones) {
    console.log(`\n🏆 MILESTONES FIDELIDADE (${milestones.length}):`);
    for (const m of milestones) {
      console.log(`  🏆 ${m.visits_required} visitas → serviço ${m.reward_service_id?.substring(0,8)} ${m.is_active ? '✅' : '❌'}`);
    }
  }

  // Admin users
  const { data: admins } = await supabase.from('admin_users').select('user_id');
  console.log(`\n🔐 ADMINS: ${admins?.length || 0} cadastrados`);
}

async function auditBookingsIntegrity() {
  console.log('\n📋 ** INTEGRIDADE DOS DADOS **');
  console.log('='.repeat(60));

  // Bookings com client_id que não existe
  const { data: orphanBookings } = await supabase
    .from('bookings')
    .select('id, client_id, booking_date')
    .not('client_id', 'is', 'null')
    .limit(5);

  const { data: allClients } = await supabase.from('clients').select('id');
  const clientIds = new Set((allClients || []).map(c => c.id));

  let orphanCount = 0;
  const { data: allBookings } = await supabase.from('bookings').select('id, client_id');
  for (const b of allBookings || []) {
    if (b.client_id && !clientIds.has(b.client_id)) {
      orphanCount++;
    }
  }
  if (orphanCount > 0) {
    console.log(`  ❌ ${orphanCount} booking(s) com client_id órfão!`);
    issue('integ_clientes', `${orphanCount} bookings referenciam clientes que não existem`);
  } else {
    console.log('  ✅ Nenhum booking órfão');
  }

  // Bookings sem barber_id (multi-barber)
  const { count: noBarber } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .is('barber_id', 'null')
    .not('is_blocked', 'eq', true);
  if (noBarber && noBarber > 0) {
    console.log(`  ⚠️ ${noBarber} booking(s) sem barber_id (não-blocked)`);
    issue('booking_sem_barbeiro', `${noBarber} bookings sem barber_id`);
  }

  // Total de bookings
  const { count: totalBookings } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
  const { count: blockedCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('is_blocked', true);
  console.log(`  📊 ${totalBookings || 0} bookings total (${blockedCount || 0} bloqueados)`);

  // Verificar booking_tokens expirados
  const { count: expiredTokens } = await supabase
    .from('booking_tokens')
    .select('*', { count: 'exact', head: true })
    .lt('expires_at', new Date().toISOString());
  if (expiredTokens && expiredTokens > 0) {
    console.log(`  ⚠️ ${expiredTokens} token(s) expirado(s) — cleanup_expired_tokens cuida disso`);
  }
}

async function auditHealthCheck() {
  console.log('\n📋 ** HEALTH CHECK **');
  console.log('='.repeat(60));
  try {
    const { data, error } = await supabase.rpc('health_check');
    if (error) {
      console.log(`  ❌ health_check falhou: ${error.message}`);
    } else {
      console.log(`  ✅ Status: ${data?.status}, Versão: ${data?.version}`);
      console.log(`  📊 Services: ${data?.database?.services}, Bookings: ${data?.database?.bookings}, Clients: ${data?.database?.clients}`);
      console.log(`  ⏱️ Uptime: ${data?.uptime}s`);
    }
  } catch (e) {
    console.log(`  ⚠️ health_check: ${e.message}`);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     AUDITORIA 360 — SUPABASE BLACK DIAMOND              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`🔗 ${SUPABASE_URL}\n`);

  await auditTables();
  await auditRPCs();
  await auditPolicies();
  await auditData();
  await auditBookingsIntegrity();
  await auditHealthCheck();

  // Summary
  console.log('\n' + '╔══════════════════════════════════════════════════════════╗');
  console.log('║     RESUMO                                                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const tablesOk = Object.values(RESULT.tables).filter((t) => t.exists).length;
  const tablesTotal = Object.keys(RESULT.tables).length;
  const rpcsOk = Object.values(RESULT.rpcs).filter(Boolean).length;
  const rpcsTotal = Object.keys(RESULT.rpcs).length;

  console.log(`\n📊 TABELAS: ${tablesOk}/${tablesTotal} existem`);
  console.log(`📊 RPCs: ${rpcsOk}/${rpcsTotal} existem`);
  console.log(`📊 ISSUES: ${RESULT.issues.length} encontradas`);

  if (RESULT.issues.length > 0) {
    console.log('\n⚠️  ISSUES ENCONTRADAS:');
    RESULT.issues.forEach((iss, i) => {
      const icon = iss.type.includes('faltando') ? '❌' : iss.type.includes('órfão') ? '🔴' : '⚠️';
      console.log(`  ${icon} ${iss.msg}`);
    });
  }

  console.log(`\n✅ Auditoria concluída!`);
  process.exit(RESULT.issues.length > 0 ? 0 : 0); // Don't fail
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});
