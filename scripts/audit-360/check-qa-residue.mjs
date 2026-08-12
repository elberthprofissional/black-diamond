// Verifica se sobraram dados de teste QA no banco de produção
const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error('Uso: node scripts/audit-360/check-qa-residue.mjs <sbp_token>');
  process.exit(1);
}
const API = 'https://api.supabase.com/v1/projects/dbukdhycfaibdshxnatt/database/query';
const q = async (sql) => {
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) return { error: t.slice(0, 200) };
  try { return JSON.parse(t); } catch { return t; }
};

console.log('Resíduo QA no banco:');
const barbers = await q("SELECT count(*) AS n FROM barbers WHERE name LIKE '%QA%' OR name LIKE '%Teste%';");
console.log('  barbers QA:', barbers[0]?.n ?? barbers);
const clients = await q("SELECT count(*) AS n FROM clients WHERE name LIKE '%QA%' OR phone LIKE '449991%';");
console.log('  clients QA:', clients[0]?.n ?? clients);
const bookings = await q(
  "SELECT count(*) AS n FROM bookings WHERE client_id IN (SELECT id FROM clients WHERE name LIKE '%QA%' OR phone LIKE '449991%');"
);
console.log('  bookings QA:', bookings[0]?.n ?? bookings);
const tokens = await q("SELECT count(*) AS n FROM client_reset_tokens;");
console.log('  reset tokens órfãos:', tokens[0]?.n ?? tokens);
