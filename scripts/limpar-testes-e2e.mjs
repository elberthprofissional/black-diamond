/**
 * Limpeza completa de dados de teste E2E acumulados na produção.
 * Remove bookings, tokens e clientes com telefones/nomes de teste.
 */
import { createClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabaseUrl } from './lib/env-keys.mjs';

const admin = createClient(getSupabaseUrl(), getServiceRoleKey(), { auth: { persistSession: false } });

const TEST_PHONES = [
  '11999887766', // booking.spec.ts
  '31998765432', // validar-deploy / diagnostico
  '31999999999', // testes antigos
  '559900000000', // e2e-fluxo-publico
];
const TEST_NAMES = [
  'Cliente Teste E2E',
  'Cliente Teste Wa',
  'Cliente Teste WA',
  'Teste Avaliacao',
  'Cliente Validacao Deploy',
  'Cliente Diagnostico Site',
  'Cliente Teste Auditoria',
  'Rate Limit Test',
];

console.log('\n🧹 LIMPEZA COMPLETA DE DADOS DE TESTE E2E\n');

// Buscar clientes de teste
const { data: clients, error: cErr } = await admin
  .from('clients')
  .select('id, name, phone')
  .or(`phone.in.(${TEST_PHONES.join(',')}),name.in.(${TEST_NAMES.join(',')})`);

if (cErr) console.log(`❌ erro: ${cErr.message}`);

if (!clients?.length) {
  console.log('   Nenhum cliente de teste encontrado.');
} else {
  const ids = clients.map((c) => c.id);
  console.log(`   Clientes de teste: ${clients.length}`);
  clients.forEach((c) => console.log(`     - ${c.name} (${c.phone})`));

  // Bookings
  const { data: bookings } = await admin.from('bookings').select('id').in('client_id', ids);
  const bookingIds = bookings?.map((b) => b.id) || [];

  // Tokens
  if (bookingIds.length) {
    const { error: tErr } = await admin.from('booking_tokens').delete().in('booking_id', bookingIds);
    console.log(`   Tokens removidos: ${bookingIds.length} ${tErr ? `❌ ${tErr.message}` : '✅'}`);
  }

  const { error: bErr } = await admin.from('bookings').delete().in('client_id', ids);
  console.log(`   Bookings removidos: ${bookingIds.length} ${bErr ? `❌ ${bErr.message}` : '✅'}`);

  const { error: dErr } = await admin.from('clients').delete().in('id', ids);
  console.log(`   Clientes removidos: ${ids.length} ${dErr ? `❌ ${dErr.message}` : '✅'}`);
}

// Verificação final
const { count } = await admin
  .from('clients')
  .select('id', { count: 'exact', head: true })
  .or(`phone.in.(${TEST_PHONES.join(',')}),name.in.(${TEST_NAMES.join(',')})`);
console.log(`\n   Clientes de teste restantes: ${count ?? '?'}`);

const { count: bTotal } = await admin.from('bookings').select('id', { count: 'exact', head: true });
console.log(`   Total de bookings na produção agora: ${bTotal ?? '?'}`);
console.log('   ✅ Limpeza concluída\n');
