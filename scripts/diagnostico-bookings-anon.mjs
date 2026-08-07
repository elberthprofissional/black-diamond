/**
 * Diagnóstico: exposição real da tabela bookings para a chave ANON.
 * Verifica coluna por coluna o que a anon consegue ler.
 */
import { createClient } from '@supabase/supabase-js';
import { getAnonKey, getServiceRoleKey, getSupabaseUrl } from './lib/env-keys.mjs';

const anon = createClient(getSupabaseUrl(), getAnonKey(), { auth: { persistSession: false } });
const admin = createClient(getSupabaseUrl(), getServiceRoleKey(), { auth: { persistSession: false } });

console.log(`\n🔎 DIAGNÓSTICO BOOKINGS × ANON`);
console.log(`   Projeto: ${getSupabaseUrl()}\n`);

// 1. Total real
const { count: total } = await admin.from('bookings').select('*', { count: 'exact', head: true });
console.log(`   Total de bookings (service role): ${total}\n`);

// 2. Tentativas de leitura anon por conjunto de colunas
const probes = [
  ['id, booking_date, booking_time, status', 'colunas básicas'],
  ['notes', 'coluna NOTES (sensível)'],
  ['total_price, discount_amount', 'colunas financeiras'],
  ['client_id, coupon_id', 'colunas de referência'],
  ['barber_id, token', 'token/barbeiro'],
];  for (const [cols, label] of probes) {
  try {
    const { data, error } = await anon.from('bookings').select(cols).limit(3);
    if (error) {
      console.log(`  ✅ anon → select(${label}): BLOQUEADO — ${error.message.slice(0, 60)}`);
    } else if (data && data.length > 0) {
      console.log(`  🚨 anon → select(${label}): ${data.length} linhas LIDAS!`);
      console.log(`      exemplo: ${JSON.stringify(data[0]).slice(0, 200)}`);
    } else {
      console.log(`  ✅ anon → select(${label}): bloqueado (0 linhas)`);
    }
  } catch (e) {
    console.log(`  ❌ anon → select(${label}): exceção ${e.message.slice(0, 60)}`);
  }
}

// 3. UPDATE probe anon (deve ser silencioso/0 linhas se RLS ok)
try {
  const { data, error } = await anon.from('bookings').update({ status: 'confirmed' }).eq('status', 'pending');
  console.log(`\n  anon UPDATE status: error=${error ? error.message.slice(0, 50) : 'none'}, afetados=${data ? '(n/a)' : '?'}`);
} catch (e) {
  console.log(`\n  anon UPDATE: exceção ${e.message.slice(0, 60)}`);
}

// 4. DELETE probe anon
try {
  const { error } = await anon.from('bookings').delete().eq('status', 'cancelled');
  console.log(`  anon DELETE: error=${error ? error.message.slice(0, 50) : 'none (0 rows geralmente)'}`);
} catch (e) {
  console.log(`  anon DELETE: exceção ${e.message.slice(0, 60)}`);
}

// 5. Verificar colunas dos bookings sem client vinculado (anomalia do revenue audit)
const { data: orphans, error: oErr } = await admin
  .from('bookings')
  .select('id, client_id, booking_date, status')
  .is('client_id', null)
  .limit(10);
console.log(`\n  Bookings com client_id NULL (service role): ${orphans?.length ?? '?'} nos primeiros 10`);
if (oErr) console.log(`  erro: ${oErr.message.slice(0, 60)}`);

// 6. bookigns sem client_id ou client inexistente
const { data: all, error: aErr } = await admin.from('bookings').select('client_id');
if (!aErr && all) {
  const nullCount = all.filter(b => !b.client_id).length;
  console.log(`  Total bookings: ${all.length} | com client_id NULL: ${nullCount}`);
}

// 7. Admin: tentar ler notes de bookings recentes (o que o admin vê)
const { data: adminSample } = await admin.from('bookings').select('id, notes, total_price').limit(2);
console.log(`\n  Service role lê: ${JSON.stringify(adminSample).slice(0, 300)}`);

console.log('');
