// Verificar se o SQL rodou corretamente
const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function query(sql) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.text() };
}

async function select(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`;
  const res = await fetch(url, { headers });
  const data = res.ok ? await res.json() : await res.text();
  return { ok: res.ok, status: res.status, data };
}

async function rpc(name, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.text() };
}

console.log('========================================');
console.log('  VERIFICANDO CONFIGURAÇÃO');
console.log('========================================\n');

// 1. Verificar coluna is_hidden
console.log('📋 1. COLUNA is_hidden');
const colCheck = await select('barbers', 'select=is_hidden&limit=1');
console.log(`  ${colCheck.ok ? '✅ is_hidden existe!' : '❌ is_hidden NÃO existe'}`);
if (!colCheck.ok) console.log(`  Erro: ${JSON.stringify(colCheck.data).substring(0,100)}`);

// 2. Verificar barbeiros
console.log('\n📋 2. BARBEIROS CADASTRADOS');
const barbers = await select('barbers', 'select=id,name,is_owner,is_hidden,user_id,is_active&order=sort_order.asc');
if (barbers.ok && barbers.data) {
  for (const b of barbers.data) {
    const badges = [];
    if (b.is_owner) badges.push('⭐ DONO');
    if (b.is_hidden) badges.push('👻 INVISÍVEL');
    if (!b.is_active) badges.push('❌ INATIVO');
    console.log(`  ${b.name} ${badges.join(' ')}`);
  }
} else {
  console.log(`  ❌ Erro: ${JSON.stringify(barbers.data).substring(0,100)}`);
}

// 3. Verificar admin_users
console.log('\n📋 3. ADMIN USERS');
const admins = await select('admin_users');
if (admins.ok && admins.data) {
  for (const a of admins.data) {
    console.log(`  ✅ user_id: ${a.user_id}`);
  }
  console.log(`  Total: ${admins.data.length} admin(s)`);
}

// 4. Testar se o RPC get_barbers funciona (e NÃO mostra o hidden)
console.log('\n📋 4. RPC get_barbers (lista pública)');
const publicBarbers = await rpc('get_barbers');
if (publicBarbers.ok && publicBarbers.data) {
  for (const b of publicBarbers.data) {
    console.log(`  ✅ ${b.name}`);
  }
  console.log(`  Total visível: ${publicBarbers.data.length} barbeiro(s)`);
}

// 5. Verificar unique constraint
console.log('\n📋 5. UNIQUE CONSTRAINT services.name');
try {
  const services = await select('services', 'select=name');
  if (services.ok && services.data) {
    const names = services.data.map(s => s.name);
    const dups = names.filter((n,i) => names.indexOf(n) !== i);
    console.log(`  ${dups.length === 0 ? '✅' : '❌'} Nomes únicos: ${dups.length === 0 ? 'sim' : 'NÃO! ' + [...new Set(dups)].join(',')}`);
    
    // Tentar inserir duplicata pra ver se constraint pegou
    const testInsert = await fetch(`${SUPABASE_URL}/rest/v1/services`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Corte de Cabelo', price: 999, duration: 999 })
    });
    if (testInsert.status === 409) {
      console.log('  ✅ Constraint UNIQUE está ativa (bloqueou duplicata!)');
    } else {
      console.log(`  ⚠️  Status: ${testInsert.status} - pode ser que a constraint não esteja ativa`);
      // Deleta o teste se criou sem querer
      if (testInsert.ok) {
        const delRes = await fetch(`${SUPABASE_URL}/rest/v1/services?name=eq.Corte%20de%20Cabelo&price=eq.999`, {
          method: 'DELETE',
          headers
        });
      }
    }
  }
} catch (e) {
  console.log(`  ❌ Erro: ${e.message}`);
}

// 6. Verificar cupom BEMVINDO
console.log('\n📋 6. CUPOM BEMVINDO');
const coupons = await select('coupons', 'select=code,discount_type,discount_value,is_active');
if (coupons.ok && coupons.data) {
  if (coupons.data.length === 0) {
    console.log('  ❌ Nenhum cupom encontrado');
  } else {
    for (const c of coupons.data) {
      console.log(`  ✅ ${c.code}: ${c.discount_type} R$${c.discount_value} (${c.is_active ? 'ativo' : 'inativo'})`);
    }
  }
}

console.log('\n========================================');
console.log('  VERIFICAÇÃO CONCLUÍDA!');
console.log('========================================');
