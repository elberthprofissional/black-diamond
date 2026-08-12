// Teste E2E do CAMINHO FELIZ: um DONO cria barbeiro + login pelo painel.
//   1. Cria admin TEMPORÁRIO + perfil de barbeiro com is_owner=true (como o Tato)
//   2. Login como esse dono
//   3. Cria barbeiro de teste via RPC upsert_barber
//   4. Chama edge function criar-acesso-barbeiro
//   5. Verifica barber.user_id + login do barbeiro novo
//   6. LIMPA TUDO
// Uso: node scripts/audit-360/test-edge-barbeiro.mjs
import { readFileSync } from 'node:fs';

const env = readFileSync('.env', 'utf8');
const get = (k) => env.match(new RegExp('^' + k + '=(.+)$', 'm'))?.[1]?.trim();
const URL = get('VITE_SUPABASE_URL');
const SRV = get('SUPABASE_SERVICE_KEY');

const h = { apikey: SRV, Authorization: 'Bearer ' + SRV, 'Content-Type': 'application/json' };
const OWNER_EMAIL = 'qa.dono.teste@blackdiamond.local';
const OWNER_PASS = 'qa-owner-123';
const BARBER_EMAIL = 'qa.barbeiro.teste@blackdiamond.local';
const BARBER_PASS = 'qa-barber-123';

const json = async (r) => {
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
};

const stamp = Date.now();
let ownerId;
let barberId;
let barberUserId;

async function cleanup() {
  console.log('\n═══ 6. Limpeza ═══');
  if (barberId) await fetch(URL + '/rest/v1/barbers?id=eq.' + barberId, { method: 'DELETE', headers: h });
  if (ownerId) {
    await fetch(URL + '/rest/v1/barbers?user_id=eq.' + ownerId, { method: 'DELETE', headers: h });
    await fetch(URL + '/rest/v1/admin_users?user_id=eq.' + ownerId, { method: 'DELETE', headers: h });
    await fetch(URL + '/auth/v1/admin/users/' + ownerId, { method: 'DELETE', headers: h });
  }
  if (barberUserId) {
    await fetch(URL + '/rest/v1/admin_users?user_id=eq.' + barberUserId, { method: 'DELETE', headers: h });
    await fetch(URL + '/auth/v1/admin/users/' + barberUserId, { method: 'DELETE', headers: h });
  }
  console.log('  limpeza OK');
}

// ── 1. Cria DONO temporário (auth + admin_users + barbers.is_owner) ──
console.log('═══ 1. Criando DONO temporário de teste ═══');
const createOwner = await fetch(URL + '/auth/v1/admin/users', {
  method: 'POST',
  headers: h,
  body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASS, email_confirm: true }),
});
const ownerUser = await json(createOwner);
console.log('  criar auth owner:', createOwner.status, ownerUser.id ? 'OK' : JSON.stringify(ownerUser).slice(0, 100));
ownerId = ownerUser.id;

if (ownerId) {
  await fetch(URL + '/rest/v1/admin_users', { method: 'POST', headers: h, body: JSON.stringify({ user_id: ownerId }) });
  const ownerBarber = await fetch(URL + '/rest/v1/barbers', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ user_id: ownerId, name: 'QA Dono ' + stamp, is_active: true, is_owner: true, is_hidden: true, sort_order: 98 }),
  });
  console.log('  criar barbers owner:', ownerBarber.status);
}

// ── 2. Login como dono ──
console.log('\n═══ 2. Login como DONO ═══');
const login = await fetch(URL + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: { apikey: SRV, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASS }),
});
const loginBody = await json(login);
console.log('  login:', login.status, loginBody.access_token ? 'OK' : JSON.stringify(loginBody).slice(0, 120));
if (!loginBody.access_token) { await cleanup(); process.exit(1); }
const adminHeaders = { apikey: SRV, Authorization: 'Bearer ' + loginBody.access_token, 'Content-Type': 'application/json' };

// ── 3. Cria barbeiro de teste ──
console.log('\n═══ 3. Criando barbeiro de teste (RPC upsert_barber) ═══');
const up = await fetch(URL + '/rest/v1/rpc/upsert_barber', {
  method: 'POST',
  headers: adminHeaders,
  body: JSON.stringify({ p_id: null, p_user_id: null, p_name: 'QA Barbeiro ' + stamp, p_phone: '44999999999', p_photo_url: null, p_bio: null, p_quote: null, p_is_active: true, p_is_owner: false, p_sort_order: 50 }),
});
const upBody = await json(up);
console.log('  upsert_barber:', up.status, String(upBody).slice(0, 60));
if (!up.ok) { await cleanup(); process.exit(1); }
barberId = String(upBody).replace(/"/g, '');

// ── 4. Edge function (caminho feliz) ──
console.log('\n═══ 4. Edge function criar-acesso-barbeiro ═══');
const fn = await fetch(URL + '/functions/v1/criar-acesso-barbeiro', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + loginBody.access_token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ barberId, name: 'QA Barbeiro ' + stamp, email: BARBER_EMAIL, password: BARBER_PASS, isOwner: false }),
});
const fnBody = await json(fn);
console.log('  edge function:', fn.status, JSON.stringify(fnBody).slice(0, 200));
barberUserId = fnBody.userId || null;

// ── 5. Verificações ──
console.log('\n═══ 5. Verificações ═══');
const barberCheck = await fetch(URL + '/rest/v1/barbers?id=eq.' + barberId + '&select=id,name,user_id', { headers: h });
const barberData = await json(barberCheck);
console.log('  barber.user_id vinculado?', barberData[0]?.user_id ? '✅ SIM' : '❌ NÃO');

const barberLogin = await fetch(URL + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: { apikey: SRV, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: BARBER_EMAIL, password: BARBER_PASS }),
});
const bl = await json(barberLogin);
console.log('  login do barbeiro novo:', barberLogin.status, bl.access_token ? '✅ FUNCIONA' : '❌ ' + JSON.stringify(bl).slice(0, 100));

// Escopo: barbeiro consegue ver apenas os próprios agendamentos (0 ainda)
if (bl.access_token) {
  const scope = await fetch(URL + '/rest/v1/bookings?select=id&limit=3', {
    headers: { apikey: SRV, Authorization: 'Bearer ' + bl.access_token },
  });
  console.log('  RLS barbeiro em bookings:', scope.status, '| 0 linhas? (leitura limitada esperada)');
}

await cleanup();
console.log('\n🏁 FIM DO TESTE');
