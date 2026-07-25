/**
 * Auditoria de faturamento — puxa TODOS os bookings com valor e cliente
 * para verificar se os dados de receita estão corretos.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dbukdhycfaibdshxnatt.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  AUDITORIA DE FATURAMENTO — BOOKINGS COMPLETOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Todos os bookings completados com cliente e serviços
  const { data: completed, error: err1 } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      booking_time,
      total_price,
      discount_amount,
      status,
      is_blocked,
      no_show,
      clients ( name, phone )
    `)
    .eq('status', 'completed')
    .eq('is_blocked', false)
    .order('booking_date', { ascending: false });

  if (err1) {
    console.error('❌ Erro ao buscar bookings completados:', err1.message);
    return;
  }

  if (!completed || completed.length === 0) {
    console.log('  Nenhum booking com status "completed" encontrado.\n');
  } else {
    console.log(`  📅 TODOS OS ${completed.length} BOOKINGS CONCLUÍDOS:\n`);
    console.log('  DATA       | HORÁRIO | CLIENTE            | VALOR  | STATUS');
    console.log('  ──────────┼─────────┼────────────────────┼────────┼────────');

    let totalReceita = 0;
    let totalDescontos = 0;
    const clientTotals = {};

    for (const b of completed) {
      const clientName = b.clients?.name || '(sem nome)';
      const clientPhone = b.clients?.phone || '';
      const valor = b.total_price || 0;
      const desconto = b.discount_amount || 0;
      totalReceita += valor;
      totalDescontos += desconto;

      // Acumula por cliente
      const key = `${clientName} (${clientPhone})`;
      if (!clientTotals[key]) clientTotals[key] = { count: 0, total: 0, descontos: 0 };
      clientTotals[key].count++;
      clientTotals[key].total += valor;
      clientTotals[key].descontos += desconto;

      const dataStr = b.booking_date?.slice(0, 10) || '--------';
      const horaStr = b.booking_time?.slice(0, 5) || '--:--';
      const nomeStr = clientName.padEnd(20).slice(0, 20);
      const valorStr = `R$ ${valor.toFixed(2)}`.padStart(7);
      const statusStr = b.status?.padEnd(7) || '-------';

      console.log(`  ${dataStr} | ${horaStr}  | ${nomeStr} | ${valorStr} | ${statusStr}`);
    }

    console.log('');
    console.log(`  ─────────────────────────────────────────────────────────`);
    console.log(`  💰 RECEITA TOTAL (completed):      R$ ${totalReceita.toFixed(2)}`);
    console.log(`  💸 TOTAL DESCONTOS:                R$ ${totalDescontos.toFixed(2)}`);
    console.log(`  📊 MÉDIA POR ATENDIMENTO:          R$ ${(totalReceita / completed.length).toFixed(2)}`);
    console.log('');

    // 2. Ranking por cliente
    console.log('  ─── RANKING POR CLIENTE ───\n');
    const sorted = Object.entries(clientTotals).sort((a, b) => b[1].total - a[1].total);

    for (const [cliente, dados] of sorted) {
      console.log(`  ${dados.count}x  ${cliente.padEnd(35)} → R$ ${dados.total.toFixed(2)}`);
    }
  }

  // 3. Todos os bookings NÃO completados (só pra ver se tem algo estranho)
  const { data: outros, error: err2 } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      booking_time,
      total_price,
      status,
      is_blocked,
      no_show,
      clients ( name, phone )
    `)
    .neq('status', 'completed')
    .order('booking_date', { ascending: false })
    .limit(20);

  if (err2) {
    console.error('❌ Erro ao buscar outros bookings:', err2.message);
    return;
  }

  if (outros && outros.length > 0) {
    console.log('\n  ─── OUTROS BOOKINGS (não completados) ───\n');
    console.log('  DATA       | HORÁRIO | CLIENTE            | VALOR  | STATUS       | NO-SHOW');
    console.log('  ──────────┼─────────┼────────────────────┼────────┼──────────────┼────────');

    for (const b of outros) {
      const clientName = b.clients?.name || '(sem nome)';
      const dataStr = b.booking_date?.slice(0, 10) || '--------';
      const horaStr = b.booking_time?.slice(0, 5) || '--:--';
      const nomeStr = clientName.padEnd(20).slice(0, 20);
      const valorStr = `R$ ${(b.total_price || 0).toFixed(2)}`.padStart(7);
      const statusStr = (b.status || '').padEnd(13);
      const noShowStr = b.no_show ? '❌ FALTOU' : '✅';
      console.log(`  ${dataStr} | ${horaStr}  | ${nomeStr} | ${valorStr} | ${statusStr} | ${noShowStr}`);
    }
    console.log(`  ... (mostrando apenas os ${outros.length} mais recentes)`);
  }

  // 4. Total geral de todos os bookings (incluindo outros status)
  const { count: totalCount, error: err3 } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('is_blocked', false);

  if (!err3) {
    console.log(`\n  📊 TOTAL GERAL DE BOOKINGS: ${totalCount}`);
  }

  // 5. Serviços cadastrados (pra referência de preço)
  const { data: servicos, error: err4 } = await supabase
    .from('services')
    .select('name, price, duration')
    .order('price', { ascending: false });

  if (servicos && servicos.length > 0) {
    console.log('\n  ─── SERVIÇOS CADASTRADOS ───\n');
    for (const s of servicos) {
      console.log(`  ✂️  ${s.name.padEnd(20)} R$ ${s.price.toFixed(2)} (${s.duration}min)`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main();
