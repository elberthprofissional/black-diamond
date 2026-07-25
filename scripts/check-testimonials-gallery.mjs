import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dbukdhycfaibdshxnatt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ'
);

async function main() {
  console.log('\n📋 TESTIMONIALS:\n');

  const { data: t, error: e } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true });

  if (e) console.log('❌ Erro:', e.message);
  else if (!t || t.length === 0) console.log('⚠️  VAZIO — Nenhum depoimento cadastrado');
  else {
    for (const row of t) {
      console.log(`  id: ${row.id?.slice(0,8)}...`);
      console.log(`  name: "${row.name}"`);
      console.log(`  text: "${row.text?.slice(0,80)}..."`);
      console.log(`  rating: ${row.rating}`);
      console.log(`  is_active: ${row.is_active}`);
      console.log(`  sort_order: ${row.sort_order}`);
      console.log(`  publish_time: ${row.publish_time}`);
      console.log('');
    }
    console.log(`  Total: ${t.length} depoimentos`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 GALLERY IMAGES:\n');

  const { data: g, error: ge } = await supabase
    .from('gallery_images')
    .select('*')
    .order('position', { ascending: true });

  if (ge) console.log('❌ Erro:', ge.message);
  else if (!g || g.length === 0) console.log('⚠️  VAZIO — Nenhuma imagem na galeria');
  else {
    for (const row of g) {
      console.log(`  id: ${row.id?.slice(0,8)}...`);
      console.log(`  image_url: ${row.image_url?.slice(0,60)}...`);
      console.log(`  alt: "${row.alt}"`);
      console.log(`  position: ${row.position}`);
      console.log('');
    }
    console.log(`  Total: ${g.length} imagens`);
  }
}

main();
