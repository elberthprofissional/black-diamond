import { createClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getAnonKey, getSupabaseUrl } from './lib/env-keys.mjs';

const URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const KEY = getServiceRoleKey();

const supabase = createClient(URL, KEY);

async function main() {
  console.log('\n📋 TODOS OS CLIENTES:\n');

  const { data, error, count } = await supabase
    .from('clients')
    .select('id, name, phone, is_blocked, deleted_at, is_mensalista', { count: 'exact' })
    .order('name');

  if (error) {
    console.log(`❌ Erro: ${error.message}`);
    return;
  }

  console.log(`Total: ${count || data?.length || 0} clientes\n`);

  if (data && data.length > 0) {
    for (const c of data) {
      const issues = [];
      if (c.deleted_at) issues.push('deleted');
      if (c.is_blocked) issues.push('blocked');
      const status = issues.length > 0 ? ` ⚠️ [${issues.join(', ')}]` : '';
      console.log(`  ${c.name.padEnd(22)} | ${(c.phone || '-').padEnd(15)}${status}`);
    }
  } else {
    console.log('⚠️  NENHUM cliente encontrado!');
    console.log('   Verificando se a tabela clients existe...');
    
    const { count: c2 } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true });
    console.log(`   Total de linhas na tabela: ${c2}`);
  }

  // Verificar se tem clientes com deleted_at != null
  const { data: deleted } = await supabase
    .from('clients')
    .select('name, phone, deleted_at')
    .not('deleted_at', 'is', null);
  
  if (deleted && deleted.length > 0) {
    console.log(`\n🗑️  Clientes soft-deletados: ${deleted.length}`);
    for (const c of deleted) {
      console.log(`   ${c.name} | ${c.phone} | deleted_at: ${c.deleted_at}`);
    }
  }

  // Verificar is_blocked
  const { data: blocked } = await supabase
    .from('clients')
    .select('name, phone')
    .eq('is_blocked', true);
  
  if (blocked && blocked.length > 0) {
    console.log(`\n🔒 Clientes bloqueados: ${blocked.length}`);
    for (const c of blocked) {
      console.log(`   ${c.name} | ${c.phone}`);
    }
  }
}

main();
