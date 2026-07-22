// Script para configurar admins + barbeiros no Supabase
const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function api(method, path, body = null) {
  const url = `${SUPABASE_URL}${path}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

// SQL queries via REST API
async function sql(query) {
  return await api('POST', '/rest/v1/rpc/', { query });
}

async function select(table, filter = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${filter ? '?' + filter : ''}`;
  const res = await fetch(url, { headers });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function insert(table, data) {
  return await api('POST', `/rest/v1/${table}`, data);
}

async function update(table, data, filter) {
  return await api('PATCH', `/rest/v1/${table}?${filter}`, data);
}

console.log('========================================');
console.log('   CONFIGURANDO ADMINS E BARBEIROS');
console.log('========================================\n');

// 1. Verificar se os usuários existem no auth.users
// Não podemos consultar auth.users diretamente via REST API,
// mas podemos tentar criar admin_users e ver se dá erro de FK
console.log('📋 VERIFICANDO USUÁRIOS...');
console.log('----------------------------------------');

const emailsToCheck = [
  'aguirrestarlyn645@gmail.com',
  'elberthmayan2007@gmail.com'
];

// Primeiro verificar admin_users existentes
const adminCheck = await select('admin_users');
console.log(`Admin users atuais: ${adminCheck.ok ? adminCheck.data?.length || 0 : 'erro'}`);
if (adminCheck.data) {
  adminCheck.data.forEach(a => console.log(`  - user_id: ${a.user_id}`));
}

// Verificar barbers existentes
const barbersCheck = await select('barbers', 'select=id,name,is_owner,user_id');
console.log(`\nBarbeiros atuais: ${barbersCheck.ok ? barbersCheck.data?.length || 0 : 'erro'}`);
if (barbersCheck.data) {
  barbersCheck.data.forEach(b => console.log(`  - ${b.name} (owner: ${b.is_owner}, user: ${b.user_id || 'nenhum'})`));
}

// 2. Verificar se coluna is_hidden já existe tentando consultar
const hiddenCheck = await select('barbers', 'select=is_hidden&limit=1');
console.log(`\nColuna is_hidden: ${hiddenCheck.ok ? '✅ já existe' : '❌ precisa criar'}`);

// Se não existe, adicionar via SQL (usando o SQL Editor REST API)
if (!hiddenCheck.ok) {
  console.log('\n📦 ADICIONANDO COLUNA is_hidden...');
  try {
    // Tenta adicionar a coluna via PATCH na tabela (não funciona para DDL)
    // Precisamos usar o Management API ou SQL
    console.log('  A coluna is_hidden precisa ser criada via SQL no SQL Editor.');
    console.log('  Vou tentar via REST API de outra forma...');
  } catch (e) {
    console.log(`  Erro: ${e.message}`);
  }
}

// 3. Tentar inserir admin_users (se falhar, o usuário não existe no auth)
console.log('\n📝 CRIANDO ADMIN USERS...');
console.log('----------------------------------------');

async function createAdminIfNotExists(email) {
  console.log(`\nTentando criar admin para: ${email}`);
  
  // Primeiro, lista admin_users para ver se já existe
  // Não podemos consultar auth.users diretamente, mas podemos tentar
  // inserir em admin_users - se o email não existir no auth, vai dar erro de FK
  
  // Vamos tentar uma abordagem diferente: consultar a tabela admin_users
  // depois tentar encontrar o user_id do email via auth
  
  // Como não podemos consultar auth.users diretamente, vamos tentar
  // inserir em admin_users com um placeholder e ver se funciona
  
  // Na verdade, o método correto é: 
  // 1. O usuário precisa primeiro fazer login (criar conta no Supabase Auth)
  // 2. Depois inserir em admin_users
  // 
  // Como alternativa, podemos tentar criar o usuário via Admin API
  
  // Tentar criar usuário via Admin API de Auth
  try {
    const createUserRes = await api('POST', '/auth/v1/admin/users', {
      email: email,
      password: 'senha123', // Senha temporária
      email_confirm: true,
      user_metadata: { full_name: email === 'aguirrestarlyn645@gmail.com' ? 'Tato' : 'Elberth' }
    });
    
    if (createUserRes.ok) {
      console.log(`  ✅ Usuário criado: ${createUserRes.data.id}`);
      return createUserRes.data.id;
    } else if (createUserRes.status === 422 && createUserRes.data?.msg?.includes('already exists')) {
      console.log(`  ⚠️  Usuário já existe, buscando ID...`);
      // Buscar o ID do usuário existente
      const usersRes = await api('GET', `/auth/v1/admin/users?filter%5Bemail%5D=${encodeURIComponent(email)}`);
      if (usersRes.ok && usersRes.data?.users?.length > 0) {
        console.log(`  ✅ ID encontrado: ${usersRes.data.users[0].id}`);
        return usersRes.data.users[0].id;
      }
    } else {
      console.log(`  ❌ Erro: ${JSON.stringify(createUserRes.data).substring(0, 200)}`);
    }
  } catch (e) {
    console.log(`  ❌ Erro: ${e.message}`);
  }
  return null;
}

// Primeiro verificar se a API Admin de Auth está acessível
const authCheck = await api('GET', '/auth/v1/admin/users?per_page=1');
console.log(`Auth API acessível: ${authCheck.ok ? '✅' : '❌'} (status ${authCheck.status})`);

if (authCheck.ok) {
  // Listar todos os users existentes
  const allUsers = await api('GET', '/auth/v1/admin/users');
  if (allUsers.ok) {
    console.log('\nUsuários existentes no Auth:');
    allUsers.data?.users?.forEach(u => {
      console.log(`  - ${u.email} (${u.id})`);
    });
    
    // Procurar nossos emails
    for (const email of emailsToCheck) {
      const user = allUsers.data?.users?.find(u => u.email === email);
      if (user) {
        console.log(`\n✅ ${email} já existe: ${user.id}`);
        // Criar admin_user
        const adminInsert = await insert('admin_users', { user_id: user.id });
        console.log(`  admin_users insert: ${adminInsert.ok ? '✅' : '❌'} ${adminInsert.status}`);
        
        // Criar barber record
        const isElberth = email === 'elberthmayan2007@gmail.com';
        const barberData = {
          user_id: user.id,
          name: isElberth ? 'Elberth (Admin)' : 'Tato',
          phone: isElberth ? '' : '4399553590',
          bio: isElberth ? '' : 'Dono da Black Diamond',
          quote: isElberth ? '' : '"Não sou o melhor, mas sou o melhor para você."',
          is_active: true,
          is_owner: true,
          sort_order: isElberth ? 99 : 0,
          is_hidden: isElberth ? true : false
        };
        
        const barberInsert = await insert('barbers', barberData);
        console.log(`  barber insert: ${barberInsert.ok ? '✅' : '❌'} ${barberInsert.status}`);
        if (!barberInsert.ok) {
          console.log(`  Erro: ${JSON.stringify(barberInsert.data).substring(0, 200)}`);
        }
      } else {
        console.log(`\n❌ ${email} NÃO encontrado no auth. Precisa criar primeiro.`);
        const createRes = await api('POST', '/auth/v1/admin/users', {
          email: email,
          password: 'BlackDiamond123!',
          email_confirm: true,
          user_metadata: { full_name: email === 'aguirrestarlyn645@gmail.com' ? 'Tato' : 'Elberth' }
        });
        console.log(`  Create user: ${createRes.ok ? '✅' : '❌'} ${JSON.stringify(createRes.data).substring(0, 200)}`);
      }
    }
  }
} else {
  console.log('❌ Auth Admin API não acessível com esta chave.');
  console.log('Precisa criar os usuários manualmente no painel Supabase.');
}

console.log('\n========================================');
console.log('   CONCLUÍDO!');
console.log('========================================');
