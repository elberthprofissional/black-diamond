/**
 * criar-acesso-barbeiro.mjs
 * =========================================================================
 * Cria o LOGIN de um barbeiro no Supabase (multi-barbeiro):
 *   1. Cria o usuário no Auth (e-mail + senha) — ou reutiliza se já existir
 *   2. Adiciona em admin_users (acesso ao painel /admin)
 *   3. Vincula em barbers.user_id (escopo: vê apenas os próprios agendamentos)
 *
 * Uso:
 *   node scripts/criar-acesso-barbeiro.mjs \
 *     --email juninho@blackdiamond.com \
 *     --password SenhaForte123! \
 *     --name "Juninho" \
 *     [--owner]           # opcional: marca como dono (vê todos os agendamentos)
 *
 * Requer SUPABASE_SERVICE_KEY no .env (nunca exponha essa chave no frontend).
 */
import { getServiceRoleKey, getSupabaseUrl } from './lib/env-keys.mjs';

const SUPABASE_URL = getSupabaseUrl();
const SERVICE_KEY = getServiceRoleKey();

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function api(method, path, body = null) {
  const url = `${SUPABASE_URL}${path}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
    args[key] = value;
    if (value !== true) i++;
  }
  return args;
}

async function findOrCreateUser(email, password) {
  // 1. Procura usuário existente
  const listRes = await api(
    'GET',
    `/auth/v1/admin/users?filter%5Bemail%5D=${encodeURIComponent(email)}`
  );
  if (listRes.ok && listRes.data?.users?.length > 0) {
    const user = listRes.data.users[0];
    console.log(`  ⚠️  Usuário já existe: ${user.email} (${user.id})`);
    return user.id;
  }

  // 2. Cria novo usuário
  const createRes = await api('POST', '/auth/v1/admin/users', {
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: email.split('@')[0] },
  });
  if (createRes.ok && createRes.data?.id) {
    console.log(`  ✅ Usuário criado: ${email} (${createRes.data.id})`);
    return createRes.data.id;
  }
  throw new Error(`Falha ao criar usuário: ${JSON.stringify(createRes.data).slice(0, 200)}`);
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || '')
    .trim()
    .toLowerCase();
  const password = String(args.password || '');
  const name = String(args.name || '').trim();
  const isOwner = args.owner === true || args.owner === 'true';

  console.log('========================================');
  console.log('   CRIANDO ACESSO DE BARBEIRO');
  console.log('========================================\n');

  if (!email || !password || !name) {
    console.error('❌ Uso:');
    console.error(
      '   node scripts/criar-acesso-barbeiro.mjs --email barbeiro@email.com --password Senha --name "Nome" [--owner]'
    );
    process.exit(1);
  }

  // ── 1. Usuário no Auth ──
  console.log(`📋 CRIANDO USUÁRIO: ${email}\n`);
  const userId = await findOrCreateUser(email, password);

  // ── 2. admin_users ──
  console.log('\n📋 VINCULANDO AO PAINEL ADMIN...');
  const adminInsert = await api('POST', '/rest/v1/admin_users', { user_id: userId });
  if (adminInsert.ok) {
    console.log('  ✅ Acesso admin adicionado.');
  } else if (adminInsert.status === 409 || /duplicate/i.test(String(adminInsert.data))) {
    console.log('  ⚠️  Já era admin.');
  } else {
    console.log(`  ❌ Erro admin_users: ${String(adminInsert.data).slice(0, 150)}`);
  }

  // ── 3. Vincular barbers.user_id ──
  console.log('\n📋 VINCULANDO AO PERFIL DE BARBEIRO...');
  const search = await api(
    'GET',
    `/rest/v1/barbers?name=eq.${encodeURIComponent(name)}&select=id,name,is_owner,user_id`
  );
  if (search.ok && search.data?.length > 0) {
    const barber = search.data[0];
    const patch = await api('PATCH', `/rest/v1/barbers?id=eq.${barber.id}`, {
      user_id: userId,
      is_owner: isOwner ? true : barber.is_owner,
    });
    if (patch.ok) {
      console.log(`  ✅ Vinculado ao barbeiro "${barber.name}" (${barber.id}).`);
    } else {
      console.log(`  ❌ Erro ao vincular: ${String(patch.data).slice(0, 150)}`);
    }
  } else {
    // Cria o perfil de barbeiro se ainda não existir
    const create = await api('POST', '/rest/v1/barbers', {
      user_id: userId,
      name,
      is_active: true,
      is_owner: isOwner,
      sort_order: 10,
    });
    if (create.ok) {
      console.log(`  ✅ Perfil de barbeiro criado: ${name}.`);
    } else {
      console.log(`  ❌ Erro ao criar perfil: ${String(create.data).slice(0, 150)}`);
    }
  }

  console.log('\n========================================');
  console.log('   CONCLUÍDO!');
  console.log(`   Login: ${email}`);
  console.log(`   Senha: (a que você definiu)`);
  console.log('   Próximo passo: preencha nome/telefone/foto do barbeiro');
  console.log('   em Configurações → Barbeiros no painel.');
  console.log('========================================\n');
}

main().catch((e) => {
  console.error(`❌ Erro fatal: ${e.message}`);
  process.exit(1);
});
