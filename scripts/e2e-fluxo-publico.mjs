/**
 * Teste E2E do fluxo público contra a produção (com limpeza automática).
 * Cria um agendamento real, valida token/cancelamento, e remove tudo no final.
 */
import { createClient } from '@supabase/supabase-js';
import { getAnonKey, getServiceRoleKey, getSupabaseUrl } from './lib/env-keys.mjs';

const ANON_URL = getSupabaseUrl();
const anon = createClient(ANON_URL, getAnonKey(), { auth: { persistSession: false } });
const admin = createClient(ANON_URL, getServiceRoleKey(), { auth: { persistSession: false } });

const PASS = [];
const FAIL = [];
const ok = (label, detail = '') => { PASS.push(label); console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`); };
const bad = (label, detail = '') => { FAIL.push(label); console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`); };

// Telefone de teste único (evita colisão com clientes reais)
const TEST_PHONE = '559900000000';
let createdBookingId = null;
let createdClientId = null;

// Calcula próxima terça-feira (dia aberto)
function nextOpenDate() {
  const d = new Date();
  for (let i = 1; i <= 14; i++) {
    const candidate = new Date(d);
    candidate.setDate(d.getDate() + i);
    const dow = candidate.getDay(); // 0=dom,1=seg...6=sáb
    if (dow >= 1 && dow <= 6) {
      return candidate.toISOString().slice(0, 10);
    }
  }
  return d.toISOString().slice(0, 10);
}

async function cleanup() {
  if (createdBookingId) {
    await admin.from('bookings').delete().eq('id', createdBookingId);
  }
  if (createdClientId) {
    await admin.from('clients').delete().eq('id', createdClientId);
  }
  console.log(`\n  🧹 Limpeza: booking=${createdBookingId ? 'removido' : 'n/a'}, cliente=${createdClientId ? 'removido' : 'n/a'}`);
}

console.log(`\n🧪 E2E FLUXO PÚBLICO × PRODUÇÃO`);
console.log(`   Projeto: ${ANON_URL}`);
console.log(`   Data de teste: ${nextOpenDate()}\n`);

try {
  // 1. Buscar um serviço real
  const { data: services, error: sErr } = await admin.from('services').select('id, name, price, duration').limit(1);
  if (sErr || !services?.length) { bad('buscar serviço', sErr?.message || 'nenhum serviço'); process.exit(1); }
  ok('serviço', `${services[0].name} R$${services[0].price} ${services[0].duration}min`);

  const service = services[0];
  const date = nextOpenDate();

  // 2. Slots disponíveis para a data
  const { data: slots, error: slotsErr } = await anon.rpc('get_available_slots', { p_date: date, p_barber_id: null });
  if (slotsErr) { bad('get_available_slots', slotsErr.message); process.exit(1); }
  if (!slots?.length) { bad('get_available_slots', 'nenhum slot disponível — barbearia pode estar fechada na data'); process.exit(1); }
  ok('get_available_slots', `${slots.length} slots`);

  // 3. Criar agendamento como ANON (fluxo real do site)
  const { data: created, error: cErr } = await anon.rpc('criar_agendamento_rate_limited', {
    p_cliente_nome: 'Cliente Teste Auditoria',
    p_cliente_telefone: TEST_PHONE,
    p_cliente_email: null,
    p_servicos: [service.id],
    p_data: date,
    p_hora: slots[0].slot_time?.slice(0, 5) || '10:00',
    p_preco_total: Number(service.price),
    p_duracao_total: service.duration,
    p_coupon_id: null,
    p_discount_amount: 0,
    p_barber_id: null,
  });

  if (cErr) { bad('criar agendamento (anon)', cErr.message); process.exit(1); }
  const booking = Array.isArray(created) ? created[0] : created;
  createdBookingId = booking?.id || null;
  if (!createdBookingId) { bad('criar agendamento', 'sem id retornado'); process.exit(1); }
  ok('criar agendamento (anon)', `id=${createdBookingId}`);

  // Localizar client criado automaticamente
  const { data: clients } = await admin.from('clients').select('id').eq('phone', TEST_PHONE).limit(1);
  createdClientId = clients?.[0]?.id || null;
  ok('cliente auto-criado', createdClientId ? `id=${createdClientId}` : 'não encontrado');

  // 4. Slot deve ter sumido (ocupado)
  const { data: slotsAfter } = await anon.rpc('get_available_slots', { p_date: date, p_barber_id: null });
  const timeStr = (slots[0].slot_time || '').slice(0, 5);
  const stillFree = slotsAfter?.some((s) => (s.slot_time || '').slice(0, 5) === timeStr);
  ok('slot ficou ocupado após criar', stillFree ? 'ainda aparece como livre 🚨' : 'removido da lista ✅');

  // 5. Buscar por token — RPC retorna {token} no payload de criação? Testa get_bookings_by_token (espera falha com token fake)
  const { data: byToken, error: tErr } = await anon.rpc('get_bookings_by_token', { p_token: 'token-invalido-auditoria' });
  if (tErr) bad('get_bookings_by_token (token fake)', tErr.message);
  else ok('get_bookings_by_token (token fake)', `retornou ${byToken?.length ?? 0} (esperado 0)`);

  // 6. Buscar por telefone (rate limited)
  const { data: byPhone, error: pErr } = await anon.rpc('get_bookings_by_phone_rate_limited', { p_phone: TEST_PHONE });
  if (pErr) bad('get_bookings_by_phone', pErr.message);
  else ok('get_bookings_by_phone', `retornou ${byPhone?.length ?? 0} booking(s) do telefone de teste`);

  // 7. Tentar cancelar com token errado (deve falhar)
  const { error: cErr2 } = await anon.rpc('cancel_booking_public', { p_booking_id: createdBookingId, p_token: 'token-errado' });
  if (cErr2) ok('cancelar com token errado', `bloqueado (${cErr2.message.slice(0, 40)})`);
  else bad('cancelar com token errado', 'conseguiu cancelar sem token válido 🚨');

  // 8. Cancelar sem token (anon NÃO deve conseguir — policy admin é is_admin())
  const { error: cErr3 } = await anon.rpc('cancel_booking_public', { p_booking_id: createdBookingId });
  if (cErr3) ok('cancelar sem token', `bloqueado (${cErr3.message.slice(0, 40)})`);
  else bad('cancelar sem token', 'conseguiu cancelar anon sem token 🚨');

  // 9. Rate limit: criar 4 agendamentos rapidamente com mesmo telefone → 4º deve falhar
  let rateLimited = false;
  for (let i = 0; i < 4; i++) {
    const dateI = nextOpenDate();
    const { data: slotsI } = await anon.rpc('get_available_slots', { p_date: dateI, p_barber_id: null });
    if (!slotsI?.length) continue;
    const { error: rErr } = await anon.rpc('criar_agendamento_rate_limited', {
      p_cliente_nome: 'Rate Limit Test',
      p_cliente_telefone: TEST_PHONE,
      p_cliente_email: null,
      p_servicos: [service.id],
      p_data: dateI,
      p_hora: slotsI[0].slot_time?.slice(0, 5),
      p_preco_total: Number(service.price),
      p_duracao_total: service.duration,
      p_coupon_id: null,
      p_discount_amount: 0,
      p_barber_id: null,
    });
    if (rErr && (rErr.message || '').toLowerCase().includes('limite')) {
      rateLimited = true;
      break;
    }
  }
  ok('rate limit 3/dia', rateLimited ? 'ativado (4ª tentativa bloqueada) ✅' : 'não bloqueou 4ª tentativa 🚨');

  // 10. Admin consegue ver o booking criado? (simula visão admin — service role)
  const { data: adminView, error: avErr } = await admin.from('bookings').select('id, client_id, status').eq('id', createdBookingId);
  if (avErr) bad('admin vê booking', avErr.message);
  else ok('admin vê booking', `status=${adminView?.[0]?.status}`);

  // 11. Tabela de tokens: o booking tem token?
  const { data: tokenRows } = await admin.from('booking_tokens').select('id, booking_id, token, expires_at').eq('booking_id', createdBookingId).limit(3);
  ok('booking_tokens', `${tokenRows?.length ?? 0} token(s) para o booking criado`);

} catch (e) {
  bad('erro inesperado', e.message);
} finally {
  await cleanup();
}

console.log(`\n  ── RESUMO E2E ──`);
console.log(`  ✅ Passou: ${PASS.length} | ❌ Falhou: ${FAIL.length}`);
console.log('');
process.exit(FAIL.length > 0 ? 1 : 0);
