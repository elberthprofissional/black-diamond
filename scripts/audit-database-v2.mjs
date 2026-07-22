/**
 * Auditoria do banco Supabase - Black Diamond (v2)
 * Usa apenas RPC functions e queries diretas que a anon key pode acessar
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) envVars[key.trim()] = vals.join('=').trim();
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

console.log('🔍 AUDITORIA DO BANCO SUPABASE - BLACK DIAMOND 💈\n');
console.log(`📡 URL: ${supabaseUrl}\n`);

async function main() {
  // ============================================================
  // 1. HEALTH CHECK
  // ============================================================
  console.log('📋 1. HEALTH CHECK');
  const { data: health, error: healthErr } = await supabase.rpc('health_check');
  if (health) {
    console.log(`   ✅ Status: ${health.status}`);
    console.log(`   📊 Banco: ${health.database?.services} serviços, ${health.database?.bookings} bookings, ${health.database?.clients} clientes`);
    console.log(`   🔖 Versão DB: ${health.version}`);
    console.log(`   ⏱ Uptime: ${Math.floor(health.uptime / 3600)}h`);
  } else {
    console.log(`   ❌ health_check falhou: ${healthErr?.message}`);
  }

  // ============================================================
  // 2. VERIFICAR SETTINGS
  // ============================================================
  console.log('\n📋 2. SETTINGS');
  const { data: settings } = await supabase.from('settings').select('key, value').limit(50);
  if (settings) {
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const expectedKeys = ['barber_name', 'barber_phone', 'barber_hours', 'working_days', 
      'opening_time', 'closing_time', 'saturday_opening', 'saturday_closing',
      'mensalista_enabled', 'multi_barber_enabled', 'max_no_shows',
      'site_url', 'loyalty_enabled'];
    
    for (const key of expectedKeys) {
      if (settingsMap[key] !== undefined) {
        const val = settingsMap[key].length > 40 ? settingsMap[key].slice(0, 40) + '...' : settingsMap[key];
        console.log(`   ✅ ${key} = ${val}`);
      } else {
        console.log(`   ❌ ${key} — FALTANDO!`);
      }
    }
    
    // Show extra keys not in expected list
    const extra = Object.keys(settingsMap).filter(k => !expectedKeys.includes(k));
    if (extra.length > 0) {
      console.log(`   ℹ️  Settings extras: ${extra.join(', ')}`);
    }
  } else {
    console.log('   ❌ Erro ao ler settings');
  }

  // ============================================================
  // 3. VERIFICAR SERVIÇOS
  // ============================================================
  console.log('\n📋 3. SERVIÇOS');
  const { data: services } = await supabase.from('services').select('id, name, price, duration').order('name');
  if (services) {
    console.log(`   ✅ ${services.length} serviços:`);
    services.forEach(s => console.log(`      - ${s.name}: R$ ${s.price} (${s.duration}min)`));
  } else {
    console.log('   ❌ Erro ao ler serviços');
  }

  // ============================================================
  // 4. VERIFICAR CLIENTES
  // ============================================================
  console.log('\n📋 4. CLIENTES');
  const { data: clients, count: clientCount } = await supabase
    .from('clients').select('id, name, phone, is_mensalista, is_blocked, created_at', { count: 'exact', head: false }).limit(100);
  if (clients) {
    const mensalistas = clients.filter(c => c.is_mensalista);
    const blocked = clients.filter(c => c.is_blocked);
    console.log(`   ✅ ${clientCount} clientes no total`);
    console.log(`      ${mensalistas.length} mensalistas`);
    console.log(`      ${blocked.length} bloqueados`);
    clients.slice(0, 5).forEach(c => 
      console.log(`      - ${c.name} (${c.phone})${c.is_mensalista ? ' 💎' : ''}${c.is_blocked ? ' 🔒' : ''}`)
    );
    if (clients.length > 5) console.log(`      ... e mais ${clientCount - 5}`);
  } else {
    console.log('   ❌ Erro ao ler clientes');
  }

  // ============================================================
  // 5. VERIFICAR BOOKINGS
  // ============================================================
  console.log('\n📋 5. BOOKINGS');
  const { data: bookings, count: bookingCount } = await supabase
    .from('bookings').select('id, booking_date, booking_time, status, total_price, is_blocked', { count: 'exact', head: false })
    .order('booking_date', { ascending: false }).limit(50);
  
  if (bookings) {
    const statusCounts = {};
    bookings.forEach(b => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });
    console.log(`   ✅ ${bookingCount} bookings no total`);
    console.log(`      Status: ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    
    // Check if barber_id exists in booking data
    const sampleBooking = bookings[0];
    if (sampleBooking) {
      console.log(`      📍 Amostra: ${sampleBooking.booking_date} ${sampleBooking.booking_time} - ${sampleBooking.status} - R$ ${sampleBooking.total_price}`);
    }
    
    // Try to check if barber_id column exists by selecting it
    const { data: barberCheck } = await supabase.from('bookings').select('barber_id').limit(1);
    if (barberCheck && barberCheck[0] && 'barber_id' in barberCheck[0]) {
      console.log(`   ✅ bookings.barber_id: COLUNA EXISTE`);
    } else if (barberCheck && !('barber_id' in barberCheck[0])) {
      console.log(`   ❌ bookings.barber_id: COLUNA NÃO EXISTE`);
    }
  } else {
    console.log('   ❌ Erro ao ler bookings');
  }

  // ============================================================
  // 6. VERIFICAR MULTI-BARBER
  // ============================================================
  console.log('\n📋 6. MULTI-BARBER');
  
  // Try to read barbers table
  const { data: barbers } = await supabase.from('barbers').select('id, name, is_active, is_owner').limit(10);
  if (barbers) {
    console.log(`   ✅ Tabela barbers: ${barbers.length} barbeiros`);
    barbers.forEach(b => console.log(`      - ${b.name}${b.is_owner ? ' 👑' : ''}${b.is_active ? '' : ' (inativo)'}`));
    
    // Try get_barbers RPC
    const { data: barbersRpc } = await supabase.rpc('get_barbers');
    if (barbersRpc) {
      console.log(`   ✅ RPC get_barbers: ${barbersRpc.length} barbeiros`);
    } else {
      console.log(`   ❌ RPC get_barbers: FALTANDO`);
    }
  } else {
    console.log(`   ❌ Tabela barbers NÃO EXISTE`);
    
    // Try to check if the RPCs exist by calling them
    const rpcs = ['get_barbers', 'get_barber_by_user_id', 'upsert_barber', 'delete_barber'];
    for (const rpc of rpcs) {
      const { error } = await supabase.rpc(rpc);
      if (error && !error.message?.includes('function is not found')) {
        // Function exists but needs params
        console.log(`   ✅ RPC ${rpc}: existe`);
      } else if (error?.message?.includes('function is not found')) {
        console.log(`   ❌ RPC ${rpc}: FALTANDO`);
      }
    }
  }

  // ============================================================
  // 7. VERIFICAR CUPONS E FIDELIDADE
  // ============================================================
  console.log('\n📋 7. CUPONS, FIDELIDADE E NO-SHOW');
  
  const { data: coupons, count: couponCount } = await supabase
    .from('coupons').select('id, code, discount_type, discount_value, is_active', { count: 'exact', head: false });
  if (coupons) {
    console.log(`   ✅ Cupons: ${couponCount} (${coupons.filter(c => c.is_active).length} ativos)`);
    coupons.forEach(c => console.log(`      - ${c.code}: ${c.discount_type} ${c.discount_value}${c.is_active ? '' : ' (inativo)'}`));
  } else {
    console.log('   📭 Cupons: tabela vazia ou sem acesso');
  }

  const { data: milestones } = await supabase.from('loyalty_milestones').select('*');
  if (milestones) {
    console.log(`   ✅ Fidelidade: ${milestones.length} milestone(s)`);
  } else {
    console.log('   📭 Fidelidade: sem milestones');
  }

  const { data: noShow } = await supabase.from('settings').select('value').eq('key', 'max_no_shows').maybeSingle();
  if (noShow) {
    console.log(`   ✅ No-Show: max ${noShow.value} faltas`);
  } else {
    console.log('   ℹ️  No-Show: não configurado (default 3)');
  }

  // ============================================================
  // 8. VERIFICAR ADMIN USERS
  // ============================================================
  console.log('\n📋 8. ADMIN USERS');
  const { data: admins } = await supabase.from('admin_users').select('user_id').limit(10);
  if (admins && admins.length > 0) {
    console.log(`   ✅ ${admins.length} admin(s) cadastrado(s)`);
  } else {
    console.log(`   ⚠️  Nenhum admin encontrado (pode ser RLS bloqueando)`);
  }

  // ============================================================
  // 9. VERIFICAR GALLERY
  // ============================================================
  console.log('\n📋 9. GALERIA');
  const { data: gallery } = await supabase.from('gallery_images').select('id, image_url, position').order('position').limit(10);
  if (gallery) {
    console.log(`   ✅ ${gallery.length} foto(s) na galeria`);
  } else {
    console.log('   📭 Galeria vazia');
  }

  // ============================================================
  // 10. VERIFICAR TOKENS E NOTIFICAÇÕES
  // ============================================================
  console.log('\n📋 10. TOKENS E NOTIFICAÇÕES');
  const { data: tokens } = await supabase.from('booking_tokens').select('id, expires_at').limit(5);
  if (tokens) {
    console.log(`   ✅ ${tokens.length} token(s) de gerenciamento ativos`);
  }

  const { data: notifs } = await supabase.from('notifications').select('id, title, read, created_at').order('created_at', { ascending: false }).limit(5);
  if (notifs) {
    console.log(`   ✅ ${notifs.length} notificação(ões) (amostra das últimas)`);
    notifs.forEach(n => console.log(`      - ${n.title}${n.read ? '' : ' 🔴'} (${n.created_at})`));
  }

  // ============================================================
  // RESUMO
  // ============================================================
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 RESUMO FINAL DA AUDITORIA');
  console.log('═══════════════════════════════════════════\n');
  
  // Summary based on findings
  const issues = [];
  
  if (health && health.version !== '3.22.0') {
    issues.push('⚠️ health_check versão desatualizada: ' + health.version + ' (código: 3.22.0)');
  }
  
  if (!barbers) {
    issues.push('🔴 CRÍTICO: Migration 008_multi_barber NÃO foi aplicada!');
    issues.push('   → Tabela barbers não existe');
    issues.push('   → Coluna barber_id em bookings não existe');
    issues.push('   → RPCs get_barbers, upsert_barber, etc. não existem');
  }
  
  if (!admins || admins.length === 0) {
    issues.push('ℹ️  Nenhum admin visível (pode ser RLS)');
  }
  
  const barberName = settings?.find(s => s.key === 'barber_name')?.value || 'não configurado';
  const barberPhone = settings?.find(s => s.key === 'barber_phone')?.value || 'não configurado';
  
  console.log(`👤 Barbeiro: ${barberName} | 📞 ${barberPhone}`);
  console.log(`📦 ${health?.database?.services || '?'} serviços, ${health?.database?.bookings || '?'} bookings, ${health?.database?.clients || '?'} clientes\n`);

  if (issues.length > 0) {
    console.log('🔴 PROBLEMAS ENCONTRADOS:\n');
    issues.forEach(i => console.log(`   ${i}`));
  } else {
    console.log('✅ Nenhum problema encontrado!');
  }
  
  console.log('\n✅ Auditoria concluída!');
}

main().catch(console.error);
