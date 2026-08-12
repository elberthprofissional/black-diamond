// Verifica se get_client_dashboard retorna o e-mail do cliente (migration 017)
const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error('Uso: node scripts/audit-360/test-dashboard-email.mjs <sbp_token>');
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
  if (!r.ok) return { error: t.slice(0, 300) };
  try { return JSON.parse(t); } catch { return t; }
};

// 1. Cria cliente de teste com e-mail
await q("DELETE FROM clients WHERE phone = '44999111444';");
const create = await q(
  "INSERT INTO clients (name, email, phone) VALUES ('Teste Email QA', 'teste-email-qa@gmail.com', '44999111444') RETURNING id;"
);
const clientId = create[0]?.id;
console.log('1. cliente criado:', clientId ? 'OK' : 'FALHOU ' + JSON.stringify(create));

// 2. Dashboard retorna o e-mail?
const dash = await q("SELECT public.get_client_dashboard('44999111444') AS d;");
const stats = dash[0]?.d?.stats;
console.log('2. stats.email =', stats?.email);
console.log('   resultado:', stats?.email === 'teste-email-qa@gmail.com' ? 'OK ✅' : 'FALHOU ❌');

// 3. Limpeza
await q("DELETE FROM clients WHERE id = '" + clientId + "';");
console.log('3. limpeza OK');
