import { createClient } from '@supabase/supabase-js';

const URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const supabase = createClient(URL, KEY);

async function main() {
  console.log('\n🔍 DIAGNÓSTICO: Por que Admin vê 0 clientes?\n');

  // 1. Quantos admins existem?
  const { data: admins, error: e1 } = await supabase
    .from('admin_users')
    .select('user_id, created_at');

  if (e1) {
    console.log(`❌ Erro admin_users: ${e1.message}`);
  } else {
    console.log(`👑 Admins cadastrados: ${admins?.length || 0}`);
    if (admins && admins.length > 0) {
      for (const a of admins) {
        console.log(`   user_id: ${a.user_id} (desde ${a.created_at?.slice(0,10)})`);
      }
    } else {
      console.log('   ⚠️  NENHUM admin cadastrado! Esse é o problema!');
    }
  }

  // 2. Testar como se fosse um admin autenticado
  // Simula o que o RLS faz: verifica se auth.uid() está em admin_users
  console.log('\n🔑 Testando RLS com chave anon (simula admin não logado):');
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTMzNDQsImV4cCI6MjA5Njg2OTM0NH0.dhF4GyQ0JzqLM-BSdD8tdmtr0zstiWJf8gu8Uq4gb9s';
  const anon = createClient(URL, anonKey);
  
  const { data: c2, error: e2 } = await anon.from('clients').select('id', { count: 'exact', head: true });
  console.log(`   Anon vê ${c2?.length || 0} clientes | erro: ${e2?.message || 'nenhum'}`);

  // 3. Verificar se o auth do Supabase tem usuários
  const { data: users, error: e3 } = await supabase.auth.admin.listUsers();
  if (e3) {
    console.log(`\n❌ Não foi possível listar users (precisa de service_role): ${e3.message}`);
  } else {
    console.log(`\n👤 Usuários cadastrados: ${users?.users?.length || 0}`);
    if (users?.users) {
      for (const u of users.users) {
        console.log(`   ${u.email || 'sem email'} | id: ${u.id} | criado: ${u.created_at?.slice(0,10)}`);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Se NENHUM admin estiver cadastrado na tabela admin_users,');
  console.log('   o RLS bloqueia TODAS as consultas de clients/bookings/etc');
  console.log('   mesmo que o usuário esteja logado!\n');
}

main();
