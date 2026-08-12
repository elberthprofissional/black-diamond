// Verifica a proteção: criar_conta_cliente NÃO pode sobrescrever senha existente
const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error('Uso: node scripts/audit-360/test-conta-protecao-senha.mjs <sbp_token>');
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

// 1. Cliente de teste com senha 'senha123' e e-mail
await q("DELETE FROM clients WHERE phone = '44999111666';");
const created = await q(
  "INSERT INTO clients (name, email, phone, password_hash) VALUES ('Teste Protecao QA', 'protecao@gmail.com', '44999111666', crypt('senha123', gen_salt('bf', 10))) RETURNING id;"
);
const cid = created[0]?.id;
console.log('1. cliente com senha criado:', cid ? 'OK' : 'FALHOU ' + JSON.stringify(created));

// 2. Tentar criar conta no mesmo telefone → deve REJEITAR
const attempt = await q(
  "SELECT public.criar_conta_cliente('Hacker QA', 'hacker@gmail.com', '44999111666', 'minhasenha') AS r;"
);
const rejected = attempt[0]?.r?.ok === false;
console.log('2. criar conta em telefone com senha:', rejected ? 'REJEITADA ✅' : 'FALHOU ❌ ' + JSON.stringify(attempt));

// 3. A senha original continua funcionando
const login = await q("SELECT public.verificar_login_cliente('44999111666', 'senha123') AS r;");
console.log('3. senha original intacta:', login[0]?.r?.ok === true ? 'OK ✅' : 'FALHOU ❌ ' + JSON.stringify(login));

// 4. A senha do atacante NÃO funciona
const hack = await q("SELECT public.verificar_login_cliente('44999111666', 'minhasenha') AS r;");
console.log('4. senha do atacante rejeitada:', hack[0]?.r?.ok === false ? 'OK ✅' : 'FALHOU ❌ ' + JSON.stringify(hack));

// 5. Telefone SEM senha ainda herda histórico ao criar conta
await q("DELETE FROM clients WHERE phone = '44999111667';");
const semSenha = await q(
  "INSERT INTO clients (name, phone) VALUES ('Sem Senha QA', '44999111667') RETURNING id;"
);
const semSenhaId = semSenha[0]?.id;
const herda = await q(
  "SELECT public.criar_conta_cliente('Sem Senha QA', 'sem-senha@gmail.com', '44999111667', 'nova123') AS r;"
);
console.log('5. telefone sem senha vincula:', herda[0]?.r?.ok === true ? 'OK ✅' : 'FALHOU ❌ ' + JSON.stringify(herda));

// 6. Limpeza
await q("DELETE FROM clients WHERE id IN ('" + cid + "', '" + semSenhaId + "');");
console.log('6. limpeza OK');
