import { createClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getAnonKey, getSupabaseUrl } from './lib/env-keys.mjs';

const supabase = createClient(
  'https://dbukdhycfaibdshxnatt.supabase.co',
  getServiceRoleKey()
);

async function main() {
  console.log('\n🔍 VERIFICANDO TRIGGER ANTI-BURRO...\n');

  // 1. Ver clientes existentes
  const { data: clients } = await supabase
    .from('clients')
    .select('name, phone')
    .order('name');

  console.log(`📋 Clientes cadastrados (${clients?.length || 0}):\n`);
  if (clients) {
    for (const c of clients) {
      const hasUpperIssue = c.name !== c.name.charAt(0).toUpperCase() + c.name.slice(1).toLowerCase();
      console.log(`   ${c.name}${hasUpperIssue ? ' ⚠️' : ''}  | ${c.phone}`);
    }
  }

  // 2. Testar o trigger com INSERT de teste
  console.log('\n🧪 Testando trigger com INSERT...');
  console.log('   Inserindo "TESTE ANTI BURRO" como nome...');
  
  const { data: inserted, error: insErr } = await supabase
    .from('clients')
    .insert({ name: 'TESTE ANTI BURRO', phone: '00000000000' })
    .select('name')
    .single();

  if (insErr) {
    console.log(`   ❌ Erro: ${insErr.message}`);
  } else {
    console.log(`   ✅ Trigger normalizou: "${inserted?.name}"`);
    console.log(`   Esperado: "Teste Anti Burro"`);
    const pass = inserted?.name === 'Teste Anti Burro';
    console.log(`   ${pass ? '✅ FUNCIONOU!' : '❌ Falhou'} (resultado: "${inserted?.name}")`);
  }

  // 3. Limpar registro de teste
  if (!insErr) {
    await supabase.from('clients').delete().eq('phone', '00000000000');
    console.log('   🧹 Registro de teste removido');
  }

  // 4. Testar preposições
  console.log('\n🧪 Testando preposições...');
  const { data: p } = await supabase
    .from('clients')
    .insert({ name: 'PEDRO DA SILVA', phone: '00000000001' })
    .select('name')
    .single();

  if (p) {
    console.log(`   "PEDRO DA SILVA" → "${p.name}"`);
    console.log(`   ${p.name === 'Pedro da Silva' ? '✅ Preposição respeitada!' : '❌'}`);
    await supabase.from('clients').delete().eq('phone', '00000000001');
    console.log('   🧹 Registro de teste removido');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main();
