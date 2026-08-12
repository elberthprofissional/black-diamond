/* Teste: criar_agendamento respeita horário próprio do barbeiro (migration 015) */
const TOKEN = process.argv.find((a) => a.startsWith('sbp_'));
const API = 'https://api.supabase.com/v1/projects/dbukdhycfaibdshxnatt/database/query';

const q = async (sql) => {
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) return { error: t.slice(0, 500) };
  try { return JSON.parse(t); } catch { return t; }
};

const nextDay = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3); // 3 dias à frente, dia de semana garantido
  return d.toISOString().slice(0, 10);
};

// 1. cria barbeiro QA com horário 10h-12h (sem domingo)
const create = await q(`INSERT INTO barbers (name, is_active, is_owner, sort_order, barber_hours)
  VALUES ('QA Horas Booking', true, false, 98, '{"1":{"enabled":true,"open":"10:00","close":"12:00"},"2":{"enabled":true,"open":"10:00","close":"12:00"},"3":{"enabled":true,"open":"10:00","close":"12:00"},"4":{"enabled":true,"open":"10:00","close":"12:00"},"5":{"enabled":true,"open":"10:00","close":"12:00"},"6":{"enabled":true,"open":"10:00","close":"12:00"},"0":{"enabled":false,"open":"10:00","close":"12:00"}}'::jsonb) RETURNING id;`);
console.log('1) barbeiro QA:', create.error ? 'FALHOU ' + create.error : 'OK');
const barberId = create?.[0]?.id;
const ds = nextDay();

// serviço de 30min
const svc = await q(`SELECT id FROM services LIMIT 1;`);
const serviceId = svc?.[0]?.id;

// 2. agenda 11:00 (dentro do horário do barbeiro → deve passar)
const inside = await q(`SELECT criar_agendamento('QA Cliente Horas', '44999998888', ARRAY['${serviceId}']::uuid[], '${ds}', '11:00:00', 50, 30, NULL, NULL, '${barberId}');`);
console.log('2) agendar 11:00 (dentro):', inside.error ? 'REJEITADO (INESPERADO): ' + inside.error : '✅ OK ' + JSON.stringify(inside).slice(0, 120));

// 3. agenda 09:00 (fora do horário do barbeiro → deve ser rejeitado)
const outside = await q(`SELECT criar_agendamento('QA Cliente Horas 2', '44999997777', ARRAY['${serviceId}']::uuid[], '${ds}', '09:00:00', 50, 30, NULL, NULL, '${barberId}');`);
console.log('3) agendar 09:00 (fora):', outside.error ? '✅ REJEITADO: ' + outside.error.slice(0, 160) : '❌ PASSOU (inesperado!)');

// 4. agenda 09:00 SEM barbeiro (usa padrão global → 09:00 deve passar)
const global = await q(`SELECT criar_agendamento('QA Cliente Horas 3', '44999996666', ARRAY['${serviceId}']::uuid[], '${ds}', '09:00:00', 50, 30, NULL, NULL, NULL);`);
console.log('4) agendar 09:00 sem barbeiro (padrão global):', global.error ? '❌ REJEITADO (inesperado): ' + global.error.slice(0, 160) : '✅ OK');

// 5. limpeza
const cleanup = await q(`DELETE FROM bookings WHERE client_id IN (SELECT id FROM clients WHERE phone IN ('44999998888','44999997777','44999996666'));
DELETE FROM clients WHERE phone IN ('44999998888','44999997777','44999996666');
DELETE FROM barbers WHERE id = '${barberId}';`);
console.log('5) limpeza:', cleanup.error ? 'FALHOU ' + cleanup.error : 'OK');
