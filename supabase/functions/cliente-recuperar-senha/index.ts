import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Config ───
const MAILERSEND_API_KEY = Deno.env.get('MAILERSEND_API_KEY') ?? '';
const MAILERSEND_FROM_EMAIL = Deno.env.get('MAILERSEND_FROM_EMAIL') ?? '';
const MAILERSEND_FROM_NAME = Deno.env.get('MAILERSEND_FROM_NAME') ?? 'Black Diamond';

const ALLOWED_ORIGINS = [
  'https://black-diamond-wheat.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  /^https:\/\/black-diamond-.*vercel\.app$/,
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((allowed) =>
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
  );
}

function getCorsHeaders(origin: string | null) {
  const allowed = isOriginAllowed(origin) ? origin : null;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 1) return email;
  return `${email.slice(0, 2)}${'*'.repeat(Math.max(2, at - 2))}${email.slice(at)}`;
}

function generateCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1000000).padStart(6, '0');
}

/** SHA-256 em hex (o banco compara com encode(digest(token,'sha256'),'hex')). */
async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sendRecoveryEmail(toEmail: string, name: string, code: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;background:#0b0b0b;color:#f5f5f5;padding:32px;border-radius:12px;max-width:480px">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:20px;font-weight:800;letter-spacing:4px">BLACK DIAMOND</div>
        <div style="color:#d4af37;font-size:12px;letter-spacing:6px;margin-top:4px">BARBEARIA</div>
      </div>
      <p style="font-size:15px;color:#e5e5e5">Olá, <b>${name}</b>!</p>
      <p style="font-size:14px;color:#b0b0b0;line-height:1.6">
        Recebemos um pedido para recuperar a senha da sua conta.<br/>
        Seu código de recuperação é:
      </p>
      <div style="text-align:center;margin:24px 0">
        <span style="font-size:34px;font-weight:800;letter-spacing:10px;color:#d4af37">${code}</span>
      </div>
      <p style="font-size:13px;color:#b0b0b0;line-height:1.6">
        O código é válido por <b>15 minutos</b> e pode ser usado uma única vez.<br/><br/>
        Se você não pediu essa recuperação, pode ignorar esta mensagem.
      </p>
      <p style="font-size:12px;color:#888;margin-top:20px;border-top:1px solid #222;padding-top:12px">
        ⚠️ <b>Dica:</b> verifique a caixa de <b>SPAM / Lixo eletrônico</b> — às vezes o e-mail cai lá.
      </p>
    </div>`;

  const body = {
    from: { email: MAILERSEND_FROM_EMAIL, name: MAILERSEND_FROM_NAME },
    to: [{ email: toEmail, name }],
    subject: 'Código de recuperação — Black Diamond',
    html,
  };

  const res = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MAILERSEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('MailerSend error', res.status, text.slice(0, 300));
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const body = await req.json();
    const identifier = String(body?.identifier ?? '').trim();

    if (!identifier) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Informe seu telefone ou e-mail.' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Encontra o cliente por telefone ou e-mail
    const cleanId = identifier.includes('@') ? identifier : identifier.replace(/\D/g, '');
    let client = null;
    if (cleanId.includes('@')) {
      const { data } = await supabase
        .from('clients')
        .select('id, name, email, phone, password_hash')
        .ilike('email', cleanId)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();
      client = data;
    } else {
      const { data } = await supabase
        .from('clients')
        .select('id, name, email, phone, password_hash')
        .eq('phone', cleanId)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();
      client = data;
    }

    if (!client) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: 'Não encontramos uma conta com esse telefone/e-mail.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!client.password_hash) {
      return new Response(
        JSON.stringify({
          ok: false,
          needs_password: false,
          phone: client.phone,
          name: client.name,
          message: 'Este telefone ainda não tem senha — você pode entrar direto.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!client.email) {
      return new Response(
        JSON.stringify({
          ok: false,
          no_email: true,
          phone: client.phone,
          name: client.name,
          message: 'Este cadastro ainda não tem e-mail para recuperação.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Rate limit: máx 3 códigos por cliente a cada 10 minutos
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('client_reset_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .gte('created_at', tenMinAgo);

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Muitos códigos enviados. Aguarde 10 minutos.' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Gera código + guarda o HASH (expira em 15 min) — o código puro nunca
    // fica no banco; a RPC redefinir_senha_cliente compara sha256(token).
    const code = generateCode();
    const tokenHash = await sha256Hex(code);
    const { error: insertError } = await supabase.from('client_reset_tokens').insert({
      client_id: client.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    if (insertError) {
      console.error('insert token error', insertError);
      return new Response(JSON.stringify({ ok: false, message: 'Erro ao gerar o código.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Envia o e-mail com o código
    if (!MAILERSEND_API_KEY || !MAILERSEND_FROM_EMAIL) {
      // E-mail não configurado ainda — remove o token para não gerar lixo
      await supabase
        .from('client_reset_tokens')
        .delete()
        .eq('client_id', client.id)
        .eq('token_hash', tokenHash);
      return new Response(
        JSON.stringify({
          ok: false,
          mailer_not_configured: true,
          message: 'Recuperação por e-mail ainda não configurada. Peça ajuda ao barbeiro.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const sent = await sendRecoveryEmail(client.email, client.name, code);
    if (!sent) {
      // Não entregou — remove o token para não deixar código órfão
      await supabase
        .from('client_reset_tokens')
        .delete()
        .eq('client_id', client.id)
        .eq('token_hash', tokenHash);
      return new Response(
        JSON.stringify({
          ok: false,
          message: 'Não foi possível enviar o e-mail agora. Tente de novo.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        name: client.name,
        phone: client.phone,
        email_masked: maskEmail(client.email),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('cliente-recuperar-senha error:', err);
    return new Response(JSON.stringify({ ok: false, message: 'Erro interno. Tente novamente.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
