/* Teste do horário por barbeiro (migration 015) — read-only + barbeiro QA temporário */
const TOKEN = process.argv.find((a) => a.startsWith('sbp_'));
const API = 'https://api.supabase.com/v1/projects/dbukdhycfaibdshxnatt/database/query';

const q = async (sql) => {
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) return { error: t.slice(0, 400) };
  try { return JSON.parse(t); } catch { return t; }
};

const nextMonday = () => {
  const d = new Date();
  const diff = (1 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};

// 1. coluna existe?
const col = await q(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='barbers' AND column_name='barber_hours';`);
console.log('1) coluna barber_hours:', col.length ? 'OK' : 'FALHOU', JSON.stringify(col));

// 2. cria barbeiro QA com horário próprio 10h-12h (só 2 slots)
const create = await q(`INSERT INTO barbers (name, is_active, is_owner, sort_order, barber_hours)
  VALUES ('Teste Horas QA', true, false, 99, '{"1":{"enabled":true,"open":"10:00","close":"12:00"},"2":{"enabled":true,"open":"10:00","close":"12:00"},"3":{"enabled":true,"open":"10:00","close":"12:00"},"4":{"enabled":true,"open":"10:00","close":"12:00"},"5":{"enabled":true,"open":"10:00","close":"12:00"},"6":{"enabled":true,"open":"10:00","close":"12:00"},"0":{"enabled":false,"open":"10:00","close":"12:00"}}'::jsonb) RETURNING id;`);
console.log('2) criar barbeiro QA:', create.error ? 'FALHOU ' + create.error : 'OK');
const barberId = create?.[0]?.id;

const ds = nextMonday();
// 3. slots GLOBAIS (padrão da barbearia) para segunda
const globalSlots = await q(`SELECT slot_time FROM get_available_slots('${ds}') ORDER BY slot_time;`);
// 4. slots do barbeiro QA (deve ser só 10:00 e 11:00)
const barberSlots = await q(`SELECT slot_time FROM get_available_slots('${ds}', '${barberId}') ORDER BY slot_time;`);
console.log(`3) slots GLOBAIS ${ds}:`, JSON.stringify((globalSlots || []).map((s) => s.slot_time)));
console.log(`4) slots BARBEIRO QA ${ds} (esperado 10:00,11:00):`, JSON.stringify((barberSlots || []).map((s) => s.slot_time)));

// 5. valida se o override funcionou
const b = (barberSlots || []).map((s) => s.slot_time);
const ok = JSON.stringify(b) === JSON.stringify(['10:00:00', '11:00:00']);
console.log('   override horário por barbeiro:', ok ? '✅ FUNCIONA' : '❌ FALHOU');

// 6. limpeza
const del = await q(`DELETE FROM barbers WHERE id = '${barberId}';`);
console.log('5) limpeza:', del.error ? 'FALHOU ' + del.error : 'OK');

// 7. grants do upsert_barber (novo signature)
const grants = await q(`SELECT proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname='public' AND p.proname='upsert_barber';`);
console.log('6) grants upsert_barber:', JSON.stringify(grants));

console.log(`\n${ok ? '✅ TESTE FINAL PASSou' : '❌ TESTE FINAL FALHOU'}`);
