import { createClient } from '@supabase/supabase-js';

const URL = 'https://dbukdhycfaibdshxnatt.supabase.co';

// Test with anon key (what the public website uses)
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTMzNDQsImV4cCI6MjA5Njg2OTM0NH0.dhF4GyQ0JzqLM-BSdD8tdmtr0zstiWJf8gu8Uq4gb9s';

// Test with service key (admin)
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const anon = createClient(URL, ANON);
const svc = createClient(URL, SVC);

async function main() {
  console.log('\n🔍 DEBUG: Por que "Repetir agendamento" não funciona?\n');

  // Testar com número do Tato (que tem 4 bookings)
  const phones = ['43999553590', '31980159559', '31980255150'];
  
  for (const phone of phones) {
    const digits = phone.replace(/\D/g, '');
    console.log(`📞 Testando telefone: ${phone}\n`);

    // 1. Testar RPC com anon key
    console.log(`  🔑 ANON RPC:`);
    const { data: aData, error: aErr } = await anon.rpc('get_last_booking_by_phone_rate_limited', {
      p_phone: digits,
    });
    if (aErr) {
      console.log(`     ❌ Erro: ${aErr.message} (${aErr.code || 'sem código'})`);
    } else {
      console.log(`     ✅ Dados: ${JSON.stringify(aData)}`);
    }

    // 2. Testar RPC com service key
    console.log(`  🔐 SERVICE RPC:`);
    const { data: sData, error: sErr } = await svc.rpc('get_last_booking_by_phone_rate_limited', {
      p_phone: digits,
    });
    if (sErr) {
      console.log(`     ❌ Erro: ${sErr.message}`);
    } else {
      console.log(`     ✅ Dados: ${JSON.stringify(sData)}`);
    }

    // 3. Ver client lookup (anon)
    console.log(`  🔑 ANON lookup_client:`);
    const { data: cData, error: cErr } = await anon.rpc('lookup_client_by_phone_rate_limited', {
      p_phone: digits,
    });
    if (cErr) {
      console.log(`     ❌ Erro: ${cErr.message} (${cErr.code || 'sem código'})`);
    } else {
      console.log(`     ✅ Dados: ${JSON.stringify(cData)}`);
    }
    
    console.log('');
  }

  // Testar a query SQL direta com service key
  console.log('🔬 Query SQL direta (service key):');
  const { data: bookings } = await svc
    .from('bookings')
    .select('id, client_id, service_ids, total_price, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (bookings) {
    for (const b of bookings) {
      console.log(`   id:${b.id?.slice(0,8)} client:${b.client_id?.slice(0,8)} status:${b.status} services:${b.service_ids?.length} price:${b.total_price}`);
    }
  }
}

main();
