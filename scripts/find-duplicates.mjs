/**
 * Encontra clientes duplicados por nome (case-insensitive)
 * e sugere unificação.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dbukdhycfaibdshxnatt.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  BUSCAR CLIENTES DUPLICADOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Puxa todos os clientes
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, phone, is_mensalista')
    .order('name');

  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }

  if (!clients || clients.length === 0) {
    console.log('  Nenhum cliente encontrado.\n');
    return;
  }

  console.log(`  Total de clientes: ${clients.length}\n`);

  // Agrupa por nome em lowercase
  const groups = {};
  for (const c of clients) {
    const key = c.name.toLowerCase().trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }

  let dupsFound = false;
  for (const [key, list] of Object.entries(groups)) {
    if (list.length > 1) {
      dupsFound = true;
      console.log(`  ⚠️  "${key}" aparece ${list.length}x:\n`);
      for (const c of list) {
        const bookingsCount = await getBookingCount(c.id);
        console.log(`      id: ${c.id}  | nome: "${c.name}" | tel: ${c.phone || '-'} | bookings: ${bookingsCount}${c.is_mensalista ? ' | 💎 MENSALISTA' : ''}`);
      }
      console.log('');
    }
  }

  if (!dupsFound) {
    console.log('  ✅ Nenhum cliente duplicado encontrado!\n');
  }

  // Mostra todos os clientes que têm variações de caixa no nome
  console.log('  ─── TODOS OS CLIENTES ───\n');
  for (const c of clients) {
    const bookingsCount = await getBookingCount(c.id);
    const hasUpperIssue = c.name !== c.name.trim() || (c.name !== c.name.toLowerCase() && c.name !== c.name.toUpperCase() && c.name !== c.name.charAt(0).toUpperCase() + c.name.slice(1).toLowerCase());
    const marker = hasUpperIssue ? ' ⚠️' : '';
    console.log(`  ${c.name.padEnd(22)} | tel: ${(c.phone || '-').padEnd(15)} | bookings: ${String(bookingsCount).padEnd(3)}${marker}`);
  }

  async function getBookingCount(clientId) {
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId);
    return count || 0;
  }
}

main();
