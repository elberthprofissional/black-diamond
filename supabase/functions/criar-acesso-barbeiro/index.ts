// criar-acesso-barbeiro
// =============================================================================
// Permite ao DONO criar o login de um barbeiro pelo painel:
//   1. Verifica que quem chamou é o dono (is_barber_owner)
//   2. Cria o usuário no Auth (e-mail + senha) ou reutiliza se já existir
//   3. Adiciona em admin_users (acesso ao painel /admin)
//   4. Vincula em barbers.user_id (escopo: vê apenas os próprios agendamentos)
//
// Chamada: supabase.functions.invoke('criar-acesso-barbeiro', {
//   body: { barberId?, name, email, password, isOwner }
// })
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://black-diamond-wheat.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  /^https:\/\/black-diamond-.*vercel\.app$/,
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((allowed) =>
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
  );
}

function getCorsHeaders(origin) {
  const allowed = isOriginAllowed(origin) ? origin : null;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceKey) return json({ error: 'Configuração de servidor ausente' }, 500, corsHeaders);

  // ── 1. Autentica e confirma que é o DONO ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autenticado' }, 401, corsHeaders);
  const token = authHeader.replace('Bearer ', '');

  const userClient = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Sessão inválida' }, 401, corsHeaders);

  // Só o DONO pode criar acesso (is_barber_owner verifica barbers.is_owner).
  // is_admin() não basta: todos os barbeiros entram em admin_users.
  const { data: isOwner } = await userClient.rpc('is_barber_owner');
  if (!isOwner) {
    return json(
      { error: 'Apenas o barbeiro chefe (dono) pode criar acesso de barbeiro' },
      403,
      corsHeaders
    );
  }

  // ── 2. Payload ──
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400, corsHeaders);
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();
  const isOwnerFlag = body.isOwner === true;

  if (!email || !password || password.length < 6) {
    return json({ error: 'Informe e-mail e senha (mínimo 6 caracteres)' }, 400, corsHeaders);
  }

  // ── 3. Cria ou reutiliza o usuário ──
  const admin = createClient(supabaseUrl, serviceKey);

  let userId;
  let created = false;
  const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name || email.split('@')[0] },
  });

  if (createErr) {
    // E-mail já registrado: reutiliza o usuário existente
    const msg = String(createErr.message || '');
    const isEmailExists =
      msg.toLowerCase().includes('already been registered') || msg.includes('email_exists');
    if (!isEmailExists) {
      return json({ error: `Falha ao criar usuário: ${msg}` }, 500, corsHeaders);
    }
    const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = listData?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!found) {
      return json(
        { error: 'E-mail já existe, mas não foi possível localizar o usuário' },
        500,
        corsHeaders
      );
    }
    userId = found.id;
  } else if (createdUser?.user) {
    userId = createdUser.user.id;
    created = true;
  } else {
    return json({ error: 'Falha ao criar usuário: resposta vazia' }, 500, corsHeaders);
  }

  // ── 4. admin_users (acesso ao painel) ──
  const { error: adminErr } = await admin
    .from('admin_users')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (adminErr) {
    return json(
      { error: `Falha ao conceder acesso ao painel: ${adminErr.message}` },
      500,
      corsHeaders
    );
  }

  // ── 5. Vincula barbers.user_id ──
  if (body.barberId) {
    const { error: linkErr } = await admin
      .from('barbers')
      .update({ user_id: userId, is_owner: isOwnerFlag })
      .eq('id', body.barberId);
    if (linkErr) {
      return json({ error: `Falha ao vincular barbeiro: ${linkErr.message}` }, 500, corsHeaders);
    }
  }

  return json({ ok: true, userId, email, created }, 200, corsHeaders);
});
