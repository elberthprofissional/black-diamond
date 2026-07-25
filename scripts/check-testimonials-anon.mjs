import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';

// Chave anon REAL (do .env) — role=anon
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTMzNDQsImV4cCI6MjA5Njg2OTM0NH0.dhF4GyQ0JzqLM-BSdD8tdmtr0zstiWJf8gu8Uq4gb9s';

const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  console.log('🔑 TESTE COM CHAVE ANON REAL (role=anon):\n');

  // 1. Testimonials (como o site público faz)
  console.log('📋 Testimonials ativos (getActiveTestimonials):\n');
  const { data: t, error: e } = await supabaseAnon
    .from('testimonials')
    .select('*')
    .eq('is_active', true)
    .not('text', 'is', null)
    .neq('text', '')
    .order('publish_time', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true });

  if (e) {
    console.log(`❌ ERRO: ${e.message}`);
    console.log(`   Código: ${e.code}`);
  } else {
    console.log(`✅ Retornou ${t?.length || 0} depoimentos`);
    if (t && t.length > 0) {
      for (const row of t) {
        console.log(`   "${row.name}": "${row.text?.slice(0,60)}..." ⭐${row.rating}`);
      }
    } else {
      console.log('⚠️  Array vazio — RLS permite acesso mas não retornou dados');
    }
  }

  // 2. Gallery (como o site público faz)
  console.log('\n📸 Gallery images:\n');
  const { data: g, error: ge } = await supabaseAnon
    .from('gallery_images')
    .select('id, image_url, alt, position')
    .order('position', { ascending: true });

  if (ge) {
    console.log(`❌ ERRO: ${ge.message}`);
  } else {
    console.log(`✅ Retornou ${g?.length || 0} imagens`);
    if (g && g.length > 0) {
      for (const row of g) {
        console.log(`   [${row.position}] "${row.alt || '(sem descrição)'}"`);
        console.log(`        ${row.image_url?.slice(0,70)}...`);
      }
    } else {
      console.log('⚠️  Array vazio — RLS permite acesso mas não retornou dados');
    }
  }
}

main();
