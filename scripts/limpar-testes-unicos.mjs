/**
 * Limpeza dos clientes de teste com telefones únicos gerados pelos testes E2E
 * (prefixo 1199 + timestamp). Remove bookings, tokens e clientes.
 */
import { createClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabaseUrl } from './lib/env-keys.mjs';

const admin = createClient(getSupabaseUrl(), getServiceRoleKey(), { auth: { persistSession: false } });

console.log('\n🧹 LIMPEZA DE CLIENTES DE TESTE (TELEFONES ÚNICOS 1199...)\n');

// Buscar clientes com telefones únicos de teste (prefixo 1199 + 7 dígitos) e nomes de teste
const { data: clients, error } = await admin
  .from('clients')
  .select('id, name, phone')
  .like('phone', '1199%');

if (error) console.log(`❌ erro: ${error.message}`);
if (!clients?.length) {
  console.log('   Nenhum cliente de teste encontrado.');
} else {
  const ids = clients.map((c) => c.id);
  console.log(`   Clientes de teste: ${clients.length}`);
  clients.forEach((c) => console.log(`     - ${c.name} (${c.phone})`));

  const { data: bookings } = await admin.from('bookings').select('id').in('client_id', ids);
  const bookingIds = bookings?.map((b) => b.id) || [];

  if (bookingIds.length) {
    await admin.from('booking_tokens').delete().in('booking_id', bookingIds);
  }
  const { error: bErr } = await admin.from('bookings').delete().in('client_id', ids);
  console.log(`   Bookings removidos: ${bookingIds.length} ${bErr ? `❌ ${bErr.message}` : '✅'}`);
  const { error: dErr } = await admin.from('clients').delete().in('id', ids);
  console.log(`   Clientes removidos: ${ids.length} ${dErr ? `❌ ${dErr.message}` : '✅'}`);
}

const { count } = await admin
  .from('clients')
  .select('id', { count: 'exact', head: true })
  .like('phone', '1199%');
console.log(`\n   Clientes de teste restantes: ${count ?? '?'}`);

const { count: bTotal } = await admin.from('bookings').select('id', { count: 'exact', head: true });
const { count: cTotal } = await admin.from('clients').select('id', { count: 'exact', head: true });
console.log(`   Total de bookings: ${bTotal} | Total de clients: ${cTotal}`);
console.log('   ✅ Limpeza concluída\n');
