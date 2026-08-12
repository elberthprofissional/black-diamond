/* Teste da migration 016 — conta do cliente + recuperação (com limpeza) */
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

const PHONE = '44999111222';
const EMAIL = 'qa.conta.cliente@teste.local';

// 1. tabela existe?
const tab = await q(`SELECT to_regclass('public.client_reset_tokens') AS t;`);
console.log('1) tabela tokens:', JSON.stringify(tab));

// 2. cria cliente QA sem senha
const c = await q(`INSERT INTO clients (name, phone, email) VALUES ('QA Conta Cliente', '${PHONE}', NULL) RETURNING id;`);
console.log('2) cliente QA:', c.error ? 'FALHOU ' + c.error : 'OK');
const clientId = c?.[0]?.id;

// 3. login sem senha → needs_password false
const noPw = await q(`SELECT verificar_login_cliente('${PHONE}', '') AS r;`);
console.log('3) login sem senha:', JSON.stringify(noPw?.[0]?.r));

// 4. criar conta (vincula + senha)
const criar = await q(`SELECT criar_conta_cliente('QA Conta Cliente', '${EMAIL}', '${PHONE}', 'senha123') AS r;`);
console.log('4) criar conta (vincular):', JSON.stringify(criar?.[0]?.r));

// 5. login por telefone com senha
const loginPhone = await q(`SELECT verificar_login_cliente('${PHONE}', 'senha123') AS r;`);
console.log('5) login por telefone:', JSON.stringify(loginPhone?.[0]?.r));

// 6. login por e-mail com senha
const loginEmail = await q(`SELECT verificar_login_cliente('${EMAIL}', 'senha123') AS r;`);
console.log('6) login por e-mail:', JSON.stringify(loginEmail?.[0]?.r));

// 7. senha errada → rejeita
const wrong = await q(`SELECT verificar_login_cliente('${PHONE}', 'errada') AS r;`);
console.log('7) senha errada:', JSON.stringify(wrong?.[0]?.r));

// 8. insere token manualmente (como a edge function faria) e redefine
const token = '654321';
const hash = await q(`SELECT encode(digest('${token}', 'sha256'), 'hex') AS h;`);
const tok = await q(`INSERT INTO client_reset_tokens (client_id, token_hash, expires_at)
  VALUES ('${clientId}', '${hash?.[0]?.h}', now() + interval '15 minutes');`);
console.log('8) token criado:', tok.error ? 'FALHOU ' + tok.error : 'OK');

const reset = await q(`SELECT redefinir_senha_cliente('${PHONE}', '${token}', 'novaSenha9') AS r;`);
console.log('9) redefinir com código:', JSON.stringify(reset?.[0]?.r));

const loginNova = await q(`SELECT verificar_login_cliente('${PHONE}', 'novaSenha9') AS r;`);
console.log('10) login com nova senha:', JSON.stringify(loginNova?.[0]?.r));

// 11. código reutilizado → rejeita (used_at marcado)
const reuse = await q(`SELECT redefinir_senha_cliente('${PHONE}', '${token}', 'outraSenha1') AS r;`);
console.log('11) reuso do código (deve falhar):', JSON.stringify(reuse?.[0]?.r));

// 12. limpar senha (admin)
const clean = await q(`SELECT limpar_senha_cliente('${clientId}') AS r;`);
console.log('12) limpar senha (admin):', JSON.stringify(clean?.[0]?.r));

const afterClean = await q(`SELECT verificar_login_cliente('${PHONE}', '') AS r;`);
console.log('13) login após limpar (sem senha):', JSON.stringify(afterClean?.[0]?.r));

// 14. email duplicado → rejeita (outro cliente com mesmo email)
const dup = await q(`INSERT INTO clients (name, phone) VALUES ('QA Duplicado', '44999111333') RETURNING id;`);
const dupId = dup?.[0]?.id;
const emailConflict = await q(`SELECT criar_conta_cliente('QA Duplicado', '${EMAIL}', '44999111333', 'senha123') AS r;`);
console.log('14) email duplicado (deve falhar):', JSON.stringify(emailConflict?.[0]?.r));

// 15. limpeza
const del = await q(`DELETE FROM client_reset_tokens WHERE client_id IN ('${clientId}', '${dupId}');
DELETE FROM clients WHERE id IN ('${clientId}', '${dupId}');`);
console.log('15) limpeza:', del.error ? 'FALHOU ' + del.error : 'OK');
