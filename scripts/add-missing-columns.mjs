import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dbukdhycfaibdshxnatt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Check current bookings columns
  const { data: sample } = await supabase.from('bookings').select('*').limit(1);
  if (sample && sample[0]) {
    const cols = Object.keys(sample[0]);
    console.log('Current columns in bookings:', cols.join(', '));
    
    const missing = [];
    if (!cols.includes('no_show')) missing.push('no_show BOOLEAN DEFAULT FALSE');
    if (!cols.includes('coupon_id')) missing.push('coupon_id UUID');
    if (!cols.includes('discount_amount')) missing.push('discount_amount NUMERIC DEFAULT 0');
    if (!cols.includes('barber_id')) missing.push('barber_id UUID');
    
    if (missing.length > 0) {
      console.log('\nColumns to add:', missing.join(', '));
      console.log('(Need SQL Editor to add these - run manually)');
    } else {
      console.log('\n✅ All columns already exist!');
    }
  }
  
  // Check testimonials
  const { data: testis, count } = await supabase.from('testimonials').select('*', { count: 'exact', head: true });
  console.log(`\nTestimonials count: ${count}`);
  
  // Check coupons
  const { data: coupons, count: cc } = await supabase.from('coupons').select('*', { count: 'exact', head: true });
  console.log(`Coupons count: ${cc}`);
  
  // Check milestones
  const { data: mstones, count: mc } = await supabase.from('loyalty_milestones').select('*', { count: 'exact', head: true });
  console.log(`Loyalty milestones count: ${mc}`);
  
  // Check services
  const { data: services } = await supabase.from('services').select('name, price, duration');
  console.log(`\nServices (${services?.length || 0}):`);
  services?.forEach(s => console.log(`  ${s.name} - R$ ${s.price} / ${s.duration}min`));
  
  // Check health version
  const { data: health } = await supabase.rpc('health_check');
  console.log(`\nHealth version: ${health?.version}`);
}

main().catch(console.error);
