/**
 * Script de auditoria do banco Supabase - Black Diamond
 * 
 * Uso: node scripts/audit-database.mjs
 * 
 * Requer: .env configurado com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env
const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) envVars[key.trim()] = vals.join('=').trim();
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ .env não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const RESULTS = {};

async function query(sql) {
  const { data, error } = await supabase.rpc('exec_sql_diag', { p_sql: sql });
  if (error) {
    // Tenta via REST API direta
    try {
      const url = `${supabaseUrl}/rest/v1/rpc/exec_sql_diag`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ p_sql: sql }),
      });
      const result = await resp.json();
      return { data: result, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }
  return { data, error };
}

async function checkRaw(sql) {
  try {
    const url = `${supabaseUrl}/rest/v1/${sql}`;
    const resp = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    if (resp.ok) {
      const data = await resp.json();
      return { data, error: null };
    }
    return { data: null, error: `${resp.status} ${resp.statusText}` };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

async function runDiagnostics() {
  console.log('🔍 INICIANDO AUDITORIA DO BANCO SUPABASE\n');
  console.log(`📡 Conectando em: ${supabaseUrl}\n`);

  // ============================================================
  // 1. LISTAR TABELAS
  // ============================================================
  console.log('📋 1. VERIFICANDO TABELAS...');
  
  const expectedTables = [
    'services', 'clients', 'bookings', 'settings', 'push_subscriptions',
    'audit_logs', 'gallery_images', 'whatsapp_templates', 'booking_tokens',
    'notifications', 'admin_users', 'mensalista_plans', 'rate_limits',
    'coupons', 'loyalty_milestones', 'client_milestones', 'testimonials',
    'barbers', 'barber_settings'  // multi-barber
  ];

  const { data: tables, error: tablesError } = await checkRaw('information_schema.tables?select=table_name&table_schema=eq.public');
  
  if (tablesError) {
    console.log(`   ⚠️  Erro ao listar tabelas: ${tablesError}`);
  } else {
    const existingTables = (tables || []).map(t => t.table_name);
    console.log(`   📊 ${existingTables.length} tabelas encontradas:\n`);
    
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        // Check row count
        const { data: countData } = await checkRaw(`${table}?select=id&limit=1`);
        const hasData = countData && countData.length > 0;
        console.log(`   ✅ ${table}${hasData ? ' 📦 (com dados)' : ' 📭 (vazia)'}`);
      } else {
        console.log(`   ❌ ${table} — FALTANDO!`);
      }
    }
    
    RESULTS.tables = { existing: existingTables, missing: expectedTables.filter(t => !existingTables.includes(t)) };
  }

  // ============================================================
  // 2. VERIFICAR COLUNAS DAS TABELAS PRINCIPAIS
  // ============================================================
  console.log('\n📋 2. VERIFICANDO ESTRUTURA DAS TABELAS...');
  
  const tableChecks = {
    bookings: ['id', 'client_id', 'barber_id', 'service_ids', 'booking_date', 'booking_time', 'total_price', 'total_duration', 'status', 'is_blocked', 'no_show', 'coupon_id', 'discount_amount', 'reminder_sent', 'notes', 'created_at'],
    clients: ['id', 'name', 'phone', 'email', 'notes', 'is_favorite', 'is_mensalista', 'mensalista_plan_id', 'mensalista_expires_at', 'is_blocked', 'manually_added', 'historical_visits', 'historical_spent', 'last_visit_date', 'deleted_at', 'created_at'],
    barbers: ['id', 'user_id', 'name', 'phone', 'photo_url', 'bio', 'quote', 'is_active', 'is_owner', 'sort_order', 'created_at'],
    settings: ['key', 'value', 'updated_at'],
  };

  for (const [table, expectedCols] of Object.entries(tableChecks)) {
    const { data: colsData, error: colsError } = await checkRaw(
      `information_schema.columns?select=column_name&table_name=eq.${table}&table_schema=eq.public`
    );
    
    if (colsError) {
      console.log(`   ⚠️  ${table}: erro ao verificar colunas`);
      continue;
    }
    
    const actualCols = (colsData || []).map(c => c.column_name);
    const missingCols = expectedCols.filter(c => !actualCols.includes(c));
    
    if (missingCols.length === 0) {
      console.log(`   ✅ ${table}: ${actualCols.length} colunas — OK`);
    } else {
      console.log(`   ⚠️  ${table}: FALTAM colunas: ${missingCols.join(', ')}`);
    }
  }

  // ============================================================
  // 3. VERIFICAR RPC FUNCTIONS
  // ============================================================
  console.log('\n📋 3. VERIFICANDO RPC FUNCTIONS...');
  
  const expectedFunctions = [
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
    'send_weekly_report', 'verificar_mensalistas',
    'check_client_no_show_block', 'is_client_blocked_by_no_show',
    'lookup_client_by_phone', 'get_bookings_by_phone', 'cancel_booking_public',
  ];

  const { data: funcsData, error: funcsError } = await checkRaw('information_schema.routines?select=routine_name&routine_type=eq.FUNCTION&specific_schema=eq.public');
  
  if (funcsError) {
    console.log(`   ⚠️  Erro ao listar funções: ${funcsError}`);
  } else {
    const existingFuncs = (funcsData || []).map(f => f.routine_name);
    
    for (const func of expectedFunctions) {
      if (existingFuncs.includes(func)) {
        console.log(`   ✅ ${func}`);
      } else {
        console.log(`   ❌ ${func} — FALTANDO!`);
      }
    }
    
    RESULTS.functions = { existing: existingFuncs, missing: expectedFunctions.filter(f => !existingFuncs.includes(f)) };
  }

  // ============================================================
  // 4. VERIFICAR TRIGGERS
  // ============================================================
  console.log('\n📋 4. VERIFICANDO TRIGGERS...');
  
  const expectedTriggers = ['trg_booking_token_inserted', 'trg_booking_status_cancelled'];
  
  const { data: trigData, error: trigError } = await checkRaw('information_schema.triggers?select=trigger_name&event_object_schema=eq.public');
  
  if (trigError) {
    console.log(`   ⚠️  Erro ao listar triggers: ${trigError}`);
  } else {
    const existingTriggers = (trigData || []).map(t => t.trigger_name);
    
    for (const trig of expectedTriggers) {
      if (existingTriggers.includes(trig)) {
        console.log(`   ✅ ${trig}`);
      } else {
        console.log(`   ❌ ${trig} — FALTANDO!`);
      }
    }
    
    RESULTS.triggers = { existing: existingTriggers, missing: expectedTriggers.filter(t => !existingTriggers.includes(t)) };
  }

  // ============================================================
  // 5. VERIFICAR CRON JOBS
  // ============================================================
  console.log('\n📋 5. VERIFICANDO CRON JOBS (via pg_cron)...');
  
  try {
    const { data: cronData } = await supabase.rpc('health_check');
    console.log(`   ✅ health_check: ${JSON.stringify(cronData)}`);
    
    // Tenta listar cron jobs
    const { data: jobData, error: jobError } = await supabase.rpc('exec_sql_diag', {
      p_sql: "SELECT jobname, schedule, command FROM cron.job ORDER BY jobname"
    });
    
    if (jobError) {
      console.log(`   ⚠️  Não foi possível listar cron jobs (precisa de service_role): ${jobError.message}`);
    } else if (jobData) {
      console.log(`   ✅ ${jobData.length} cron jobs encontrados:`);
      jobData.forEach(j => console.log(`      - ${j.jobname}: ${j.schedule}`));
    }
  } catch (e) {
    console.log(`   ⚠️  Erro ao verificar cron jobs: ${e.message}`);
  }

  // ============================================================
  // 6. VERIFICAR CONTEÚDO DAS TABELAS PRINCIPAIS
  // ============================================================
  console.log('\n📋 6. AMOSTRA DE DADOS DAS TABELAS...');
  
  const dataTables = ['services', 'clients', 'bookings', 'settings', 'coupons', 'gallery_images'];
  
  for (const table of dataTables) {
    const { data, error } = await checkRaw(`${table}?select=*&limit=3`);
    if (error) {
      console.log(`   ⚠️  ${table}: erro ao ler dados`);
    } else if (data && data.length > 0) {
      console.log(`   ✅ ${table}: ${data.length}+ registros (amostra: ${JSON.stringify(data[0]).slice(0, 120)}...)`);
    } else {
      console.log(`   📭 ${table}: vazia`);
    }
  }

  // ============================================================
  // 7. CHECK MULTI-BARBER
  // ============================================================
  console.log('\n📋 7. VERIFICANDO MULTI-BARBER...');
  
  // Check if barber_id column exists in bookings
  const { data: barberIdCol } = await checkRaw(
    `information_schema.columns?select=column_name&table_name=eq.bookings&column_name=eq.barber_id&table_schema=eq.public`
  );
  
  if (barberIdCol && barberIdCol.length > 0) {
    console.log(`   ✅ bookings.barber_id: coluna existe`);
  } else {
    console.log(`   ❌ bookings.barber_id: COLUNA FALTANDO!`);
  }
  
  // Check if barbers table exists
  const { data: barbersTable } = await checkRaw(`barbers?select=id,name,is_active,is_owner&limit=5`);
  if (barbersTable && !barbersTable.error) {
    console.log(`   ✅ barbers: ${barbersTable.length} barbeiros cadastrados`);
    barbersTable.forEach(b => console.log(`      - ${b.name}${b.is_owner ? ' 👑 (dono)' : ''}${b.is_active ? '' : ' ❌ (inativo)'}`));
  } else {
    console.log(`   ❌ barbers: TABELA FALTANDO OU VAZIA`);
  }

  // ============================================================
  // 8. VERIFICAR ADMIN USERS
  // ============================================================
  console.log('\n📋 8. VERIFICANDO ADMIN USERS...');
  
  const { data: admins } = await checkRaw('admin_users?select=user_id&limit=10');
  if (admins && admins.length > 0) {
    console.log(`   ✅ ${admins.length} admin(s) cadastrado(s)`);
  } else {
    console.log(`   ⚠️  Nenhum admin cadastrado!`);
  }

  // ============================================================
  // RESUMO
  // ============================================================
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 RESUMO DA AUDITORIA');
  console.log('═══════════════════════════════════════════\n');
  
  if (RESULTS.tables?.missing?.length > 0) {
    console.log(`❌ TABELAS FALTANDO: ${RESULTS.tables.missing.join(', ')}`);
  } else {
    console.log('✅ Todas as tabelas esperadas existem!');
  }
  
  if (RESULTS.functions?.missing?.length > 0) {
    console.log(`❌ FUNCTIONS FALTANDO: ${RESULTS.functions.missing.join(', ')}`);
  } else {
    console.log('✅ Todas as funções esperadas existem!');
  }
  
  if (RESULTS.triggers?.missing?.length > 0) {
    console.log(`❌ TRIGGERS FALTANDO: ${RESULTS.triggers.missing.join(', ')}`);
  } else {
    console.log('✅ Todos os triggers esperados existem!');
  }

  console.log('\n✅ Auditoria concluída!');
}

runDiagnostics().catch(console.error);
