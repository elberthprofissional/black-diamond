/**
 * Configura a chave PIX do dono e cria subscriptions para barbeiros existentes.
 */
const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Accept': 'application/json',
  'Prefer': 'resolution=merge-duplicates',
};

async function main() {
  console.log('='.repeat(60));
  console.log('  CONFIGURACAO DO SISTEMA DE ASSINATURAS');
  console.log('='.repeat(60));

  // Step 1: Save owner PIX key
  console.log('\n📋 Step 1: Salvando chave PIX do dono...');
  const pixResp = await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      key: 'owner_pix_key',
      value: '70263397610',
    }),
  });

  if (pixResp.ok || pixResp.status === 201) {
    console.log('   ✅ Chave PIX salva: 70263397610');
  } else {
    const text = await pixResp.text();
    console.log(`   ⚠️  ${pixResp.status}: ${text.substring(0, 100)}`);
  }

  // Step 2: Create subscriptions for existing non-owner barbers
  console.log('\n📋 Step 2: Criando subscriptions para barbeiros não-owners...');
  const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_subscription_paid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      p_barber_id: '00000000-0000-0000-0000-000000000000',
      p_payment_method: 'pix',
    }),
  });

  // Try inserting subscriptions directly for non-owner barbers
  // First, get list of non-owner barbers
  const barbersResp = await fetch(
    `${SUPABASE_URL}/rest/v1/barbers?select=id,name,is_owner&is_owner=eq.false`,
    { headers }
  );
  const nonOwnerBarbers = await barbersResp.json();
  
  if (Array.isArray(nonOwnerBarbers) && nonOwnerBarbers.length > 0) {
    console.log(`   Encontrados ${nonOwnerBarbers.length} barbeiros não-owners`);
    
    for (const barber of nonOwnerBarbers) {
      const subResp = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          barber_id: barber.id,
          status: 'pending',
          grace_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }),
      });
      
      if (subResp.ok || subResp.status === 201) {
        console.log(`   ✅ Subscription criada para ${barber.name}`);
      } else {
        const text = await subResp.text();
        console.log(`   ⚠️  ${barber.name}: ${text.substring(0, 100)}`);
      }
    }
  } else {
    console.log('   ✅ Nenhum barbeiro não-owner encontrado (todos são donos)');
  }

  // Step 3: Verify setup
  console.log('\n📋 Step 3: Verificando configuração...');
  const verifyResp = await fetch(
    `${SUPABASE_URL}/rest/v1/settings?key=eq.owner_pix_key&select=key,value`,
    { headers }
  );
  const settings = await verifyResp.json();
  
  if (Array.isArray(settings) && settings.length > 0) {
    console.log(`   ✅ owner_pix_key configurado: ${settings[0].value}`);
  } else {
    console.log('   ⚠️  owner_pix_key não encontrado nas settings');
  }

  const subCountResp = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?select=count`,
    { headers, ...{ headers: { ...headers, Prefer: 'count=exact' } } }
  );

  console.log('\n' + '='.repeat(60));
  console.log('  CONFIGURACAO CONCLUIDA!');
  console.log('='.repeat(60));
}

main().catch(console.error);
