import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as webpush from 'https://esm.sh/web-push@3.6.7';

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:elberthmayan2007@gmail.com';

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  id?: string;
}

if (VAPID_PRIVATE_KEY && VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  clientPhone?: string;
  manageUrl?: string;
}

const ALLOWED_ORIGINS = [
  'https://black-diamond.vercel.app',
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
  const allowed = isOriginAllowed(origin) ? origin : 'https://black-diamond.vercel.app';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
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

  // ── JWT Verification ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const authClient = createClient(supabaseUrl, supabaseServiceKey);
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Token inválido' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    return new Response(JSON.stringify({ error: 'VAPID not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const body: PushPayload = await req.json();
    const { title, body: messageBody, icon, tag, url } = body;

    if (!title || !messageBody) {
      return new Response(JSON.stringify({ error: 'Missing required fields: title, body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth');

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions', sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const payload = JSON.stringify({
      title,
      body: messageBody,
      icon: icon || '/assets/logo.webp',
      tag: tag || 'black-diamond-notification',
      url: url || '/admin',
    });

    // Send to all subscriptions with concurrency control (max 5 at a time)
    const results = [];
    const chunkSize = 5;
    for (let i = 0; i < subscriptions.length; i += chunkSize) {
      const chunk = subscriptions.slice(i, i + chunkSize);
      const chunkResults = await Promise.allSettled(
        chunk.map(async (sub: PushSubscription) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              { TTL: 86400 }
            );
            return true;
          } catch (err: unknown) {
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 410 && sub.id) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
            return false;
          }
        })
      );
      results.push(...chunkResults);
    }

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    const failed = results.filter((r) => r.status === 'fulfilled' && !r.value).length;

    // Also save to notifications table for in-app center
    try {
      const { data: admins } = await supabase.from('admin_users').select('user_id');

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin: { user_id: string }) => ({
          user_id: admin.user_id,
          title,
          body: messageBody,
          tag: tag || null,
          url: url || '/admin',
        }));
        await supabase.from('notifications').insert(notifications);
      }
    } catch {
      // Notifications are best-effort; don't fail the push
    }

    return new Response(JSON.stringify({ sent, failed, total: subscriptions.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err: unknown) {
    console.error('Error in send-push Edge Function:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
