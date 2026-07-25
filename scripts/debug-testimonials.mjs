import { createClient } from '@supabase/supabase-js';

const URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTMzNDQsImV4cCI6MjA5Njg2OTM0NH0.dhF4GyQ0JzqLM-BSdD8tdmtr0zstiWJf8gu8Uq4gb9s';
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const anon = createClient(URL, ANON);
const svc = createClient(URL, SERVICE);

async function main() {
  console.log('🔬 DEBUG: Por que testimonials retorna 0 para anon?\n');

  // 1. Query simples sem filtros com anon
  console.log('1️⃣ Teste 1: SELECT * sem filtros (anon)');
  const { data: t1, error: e1, count: c1 } = await anon
    .from('testimonials')
    .select('*', { count: 'exact' });
  console.log(`   count=${c1} | data.length=${t1?.length} | error=${e1?.message || 'nenhum'}`);

  // 2. Query com is_active=true sem outros filtros (anon)
  console.log('\n2️⃣ Teste 2: SELECT * WHERE is_active=true (anon)');
  const { data: t2, error: e2 } = await anon
    .from('testimonials')
    .select('id, name, text, is_active, rating')
    .eq('is_active', true);
  console.log(`   data.length=${t2?.length} | error=${e2?.message || 'nenhum'}`);
  if (t2 && t2.length > 0) {
    for (const r of t2) {
      console.log(`   "${r.name}" text="${r.text?.slice(0,30)}" active=${r.is_active}`);
    }
  }

  // 3. Query COM todos os filtros (anon) - igual ao getActiveTestimonials
  console.log('\n3️⃣ Teste 3: Query completa igual ao getActiveTestimonials (anon)');
  const { data: t3, error: e3 } = await anon
    .from('testimonials')
    .select('*')
    .eq('is_active', true)
    .not('text', 'is', null)
    .neq('text', '')
    .order('publish_time', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true });
  console.log(`   data.length=${t3?.length} | error=${e3?.message || 'nenhum'}`);
  if (t3 && t3.length > 0) {
    for (const r of t3) {
      console.log(`   "${r.name}" text="${r.text?.slice(0,30)}"`);
    }
  }

  // 4. Query com service key - pra ver os texts
  console.log('\n4️⃣ Teste 4: Service key - ver texts reais');
  const { data: t4 } = await svc
    .from('testimonials')
    .select('id, name, text, is_active, publish_time, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  console.log(`   Total: ${t4?.length || 0}`);
  if (t4) {
    for (const r of t4) {
      const textPreview = r.text ? `"${r.text.slice(0,50)}"` : '(NULL)';
      const textLen = r.text ? r.text.length : 0;
      console.log(`   [${r.sort_order}] "${r.name}" text=${textPreview} (len=${textLen}) is_active=${r.is_active} publish=${r.publish_time || 'NULL'}`);
    }
  }

  // 5. A solução: query mínima pra confirmar que RLS funciona
  console.log('\n5️⃣ Teste 5: Query só com is_active (anon)');
  const { data: t5 } = await anon
    .from('testimonials')
    .select('id, name, text')
    .eq('is_active', true);
  console.log(`   Retornou ${t5?.length || 0}`);
}

main();
