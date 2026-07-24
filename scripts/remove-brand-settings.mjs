import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // Remove brand_name and brand_color from settings — agora hardcoded
  const { error: err1 } = await supabase
    .from('settings')
    .delete()
    .in('key', ['brand_name', 'brand_color']);

  if (err1) {
    console.error('❌ Erro ao remover settings:', err1.message);
    process.exit(1);
  }
  console.log('✅ Removido brand_name e brand_color das settings do Supabase!');
  console.log('   Agora esses valores são hardcoded:');
  console.log('   brand_name  = "Black Diamond"');
  console.log('   brand_color = "#D4AF37" (dourado)');
}

main().catch(console.error);
