import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface GoogleReview {
  name?: string;
  rating?: number;
  text?: { text?: string; languageCode?: string };
  authorAttribution?: { displayName?: string; uri?: string };
  publishTime?: string;
}

interface ReviewInput {
  name: string;
  rating: number;
  text: string;
  is_active: boolean;
  sort_order: number;
}

const ALLOWED_ORIGINS = [
  'https://black-diamond.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
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

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ── Auth: verify JWT ──
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

  // ── Get API key and Place ID from Edge Function secrets ──
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? '';
  const placeId = Deno.env.get('GOOGLE_PLACE_ID') ?? '';

  if (!apiKey || !placeId) {
    return new Response(
      JSON.stringify({
        error:
          'GOOGLE_PLACES_API_KEY e GOOGLE_PLACE_ID não configurados. Execute: supabase secrets set GOOGLE_PLACES_API_KEY=... e GOOGLE_PLACE_ID=...',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    // Consume request body (ignored, only for validation)
    await req.json().catch(() => ({}));

    // ── Fetch from Google Places API (New) ──
    const url = `https://places.googleapis.com/v1/places/${placeId}?language=pt-BR`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'reviews',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google API error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as { reviews?: GoogleReview[] };
    const reviews = data.reviews ?? [];

    if (reviews.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma review encontrada.', added: 0, skipped: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ── Filter: only reviews WITH text ──
    const withText = reviews.filter((r) => r.text?.text && r.text.text.trim().length > 0);

    // ── Connect to Supabase ──
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get existing testimonial texts to avoid duplicates
    const { data: existing } = await supabase.from('testimonials').select('text');
    const existingTexts = new Set(
      (existing ?? []).map((t: { text: string }) => t.text.trim().toLowerCase())
    );

    // Get current max sort_order
    const { data: maxOrder } = await supabase
      .from('testimonials')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);
    let nextOrder = ((maxOrder?.[0] as { sort_order?: number })?.sort_order ?? -1) + 1;

    let added = 0;
    let skipped = 0;

    const toInsert: ReviewInput[] = [];

    for (const review of withText) {
      const text = review.text!.text!.trim();
      const normalizedText = text.toLowerCase();

      // Skip if text already exists in DB
      if (existingTexts.has(normalizedText)) {
        skipped++;
        continue;
      }

      toInsert.push({
        name: review.authorAttribution?.displayName ?? 'Cliente Google',
        rating: review.rating ?? 5,
        text: text,
        is_active: true,
        sort_order: nextOrder++,
      });
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('testimonials').insert(toInsert);

      if (insertError) throw insertError;
      added = toInsert.length;
    }

    return new Response(
      JSON.stringify({
        message: `Sincronizado! ${added} novo(s) adicionado(s), ${skipped} duplicata(s) ignorada(s).`,
        added,
        skipped,
        total: reviews.length,
        withText: withText.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('Error in sync-google-reviews:', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
