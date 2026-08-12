// Teste das RPCs do dashboard: atualizar_email_cliente + alterar_senha_cliente
const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error('Uso: node scripts/audit-360/test-conta-email-senha.mjs <sbp_token>');
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

// 1. Cliente de teste com senha 'senha123'
await q("DELETE FROM clients WHERE phone = '44999111555';");
const created = await q(
  "INSERT INTO clients (name, email, phone, password_hash) VALUES ('Teste Email QA', '', '44999111555', crypt('senha123', gen_salt('bf', 10))) RETURNING id;"
);
const cid = created[0]?.id;
console.log('1. cliente criado:', cid ? 'OK' : 'FALHOU ' + JSON.stringify(created));

// 2. atualizar_email_cliente
const upd = await q("SELECT public.atualizar_email_cliente('44999111555', 'qa-novo@gmail.com') AS r;");
const updOk = upd[0]?.r?.ok === true;
console.log('2. atualizar e-mail:', updOk ? 'OK ✅' : 'FALHOU ❌ ' + JSON.stringify(upd));
const checkEmail = await q("SELECT email FROM clients WHERE id = '" + cid + "';");
console.log('   email no banco:', checkEmail[0]?.email, checkEmail[0]?.email === 'qa-novo@gmail.com' ? 'OK ✅' : 'FALHOU ❌');

// 3. alterar_senha_cliente com senha ERRADA → rejeita
const wrong = await q("SELECT public.alterar_senha_cliente('44999111555', 'errada', 'nova123') AS r;");
console.log('3. trocar senha com senha errada:', wrong[0]?.r?.ok === false ? 'REJEITADA ✅' : 'FALHOU ❌ ' + JSON.stringify(wrong));

// 4. alterar_senha_cliente com senha CERTA → ok
const ok = await q("SELECT public.alterar_senha_cliente('44999111555', 'senha123', 'nova123') AS r;");
console.log('4. trocar senha com senha certa:', ok[0]?.r?.ok === true ? 'OK ✅' : 'FALHOU ❌ ' + JSON.stringify(ok));

// 5. Login com a NOVA senha funciona
const login = await q("SELECT public.verificar_login_cliente('44999111555', 'nova123') AS r;");
console.log('5. login com nova senha:', login[0]?.r?.ok === true ? 'OK ✅' : 'FALHOU ❌ ' + JSON.stringify(login));

// 6. Limpeza
await q("DELETE FROM clients WHERE id = '" + cid + "';");
console.log('6. limpeza OK');
