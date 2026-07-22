// Auditoria rápida do Supabase via REST API
const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTMzNDQsImV4cCI6MjA5Njg2OTM0NH0.dhF4GyQ0JzqLM-BSdD8tdmtr0zstiWJf8gu8Uq4gb9s';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function query(table, options = {}) {
  const params = new URLSearchParams();
  if (options.select) params.set('select', options.select);
  if (options.limit) params.set('limit', options.limit);
  if (options.order) params.set('order', options.order);
  const url = `${SUPABASE_URL}/rest/v1/${table}${params.toString() ? '?' + params.toString() : ''}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      return { error: `${res.status}: ${text.substring(0, 200)}` };
    }
    return { data: await res.json() };
  } catch (e) {
    return { error: e.message };
  }
}

async function rpc(name, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${name}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: `${res.status}: ${text.substring(0, 200)}` };
    }
    return { data: await res.json() };
  } catch (e) {
    return { error: e.message };
  }
}

console.log('========================================');
console.log('   AUDITORIA RÁPIDA - SUPABASE');
console.log('========================================\n');

// 1. Tabelas: contagem de registros
console.log('📊 CONTAGEM DE REGISTROS POR TABELA');
console.log('----------------------------------------');

const tables = [
  'services', 'clients', 'bookings', 'settings', 'gallery_images',
  'push_subscriptions', 'audit_logs', 'booking_tokens', 'notifications',
  'admin_users', 'mensalista_plans', 'coupons', 'loyalty_milestones',
  'client_milestones', 'testimonials', 'whatsapp_templates', 'barbers',
  'barber_settings', 'rate_limits',
];

for (const table of tables) {
  const result = await query(table, { select: 'id', limit: '1' });
  if (result.error) {
    if (result.error.includes('404') || result.error.includes('relation') || result.error.includes('does not exist')) {
      console.log(`  ❌ ${table}: TABELA NÃO EXISTE`);
    } else if (result.error.includes('401') || result.error.includes('permission')) {
      console.log(`  ⚠️  ${table}: sem permissão de leitura`);
    } else {
      console.log(`  ⚠️  ${table}: ${result.error.substring(0, 80)}`);
    }
  } else {
    // Get count
    const countResult = await query(table, { select: 'id', limit: '1000' });
    if (countResult.data) {
      console.log(`  ✅ ${table}: ${countResult.data.length} registro(s)`);
    }
  }
}

// 2. Serviços
console.log('\n📋 SERVIÇOS CADASTRADOS');
console.log('----------------------------------------');
const services = await query('services', { select: 'id,name,price,duration', order: 'name.asc' });
if (services.data) {
  for (const s of services.data) {
    console.log(`  ✂️  ${s.name} - R$ ${s.price} (${s.duration}min)`);
  }
  // Check for duplicates
  const names = services.data.map(s => s.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    console.log(`  ❌ DUPLICATAS ENCONTRADAS: ${[...new Set(duplicates)].join(', ')}`);
  } else {
    console.log('  ✅ Nomes únicos - sem duplicatas');
  }
}

// 3. Settings
console.log('\n⚙️  CONFIGURAÇÕES (settings)');
console.log('----------------------------------------');
const settings = await query('settings', { select: 'key,value' });
if (settings.data) {
  for (const s of settings.data) {
    const display = s.key === 'barber_hours' ? '(JSON)' : s.value.substring(0, 50);
    console.log(`  ${s.key}: ${display}`);
  }
}

// 4. Booker barber_id column exists
console.log('\n🔍 VERIFICAÇÃO DE COLUNAS');
console.log('----------------------------------------');
// Check if barber_id exists in bookings by trying to query it
const barberCheck = await query('bookings', { select: 'id,barber_id', limit: '1' });
if (barberCheck.error && barberCheck.error.includes('barber_id')) {
  console.log('  ❌ bookings.barber_id: COLUNA AUSENTE');
} else if (barberCheck.data) {
  console.log('  ✅ bookings.barber_id: existe');
}

// 5. Admin users
console.log('\n👤 USUÁRIOS ADMIN');
console.log('----------------------------------------');
const admins = await query('admin_users', { select: 'user_id' });
if (admins.data) {
  console.log(`  ${admins.data.length} admin(s) cadastrado(s)`);
  if (admins.data.length === 0) {
    console.log('  ⚠️  Nenhum admin encontrado!');
  }
}

// 6. Coupons
console.log('\n🎫 CUPONS');
console.log('----------------------------------------');
const coupons = await query('coupons', { select: 'code,discount_type,discount_value,is_active' });
if (coupons.data) {
  if (coupons.data.length === 0) {
    console.log('  ⚠️  Nenhum cupom cadastrado');
  } else {
    for (const c of coupons.data) {
      console.log(`  ${c.code}: ${c.discount_type} ${c.discount_value} (${c.is_active ? 'ativo' : 'inativo'})`);
    }
  }
}

// 7. Health check
console.log('\n🏥 HEALTH CHECK');
console.log('----------------------------------------');
const health = await rpc('health_check');
if (health.data) {
  console.log(`  Status: ${health.data.status}`);
  console.log(`  Versão: ${health.data.version}`);
  console.log(`  Serviços: ${health.data.database?.services}`);
  console.log(`  Bookings: ${health.data.database?.bookings}`);
  console.log(`  Clientes: ${health.data.database?.clients}`);
  console.log(`  Uptime: ${health.data.uptime}s`);
} else if (health.error) {
  console.log(`  ❌ Health check falhou: ${health.error.substring(0, 100)}`);
}

console.log('\n========================================');
console.log('   AUDITORIA CONCLUÍDA');
console.log('========================================');
