/**
 * Corrigir RLS da tabela testimonials.
 * A política atual NÃO especifica TO anon, authenticated,
 * então o Supabase/PostgreSQL não aplica pra usuários anônimos.
 */
const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

async function execSql(sql) {
  const res = await fetch(`${SUPABASE_URL}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL error (${res.status}): ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('\n🔧 CORRIGINDO RLS DOS DEPOIMENTOS...\n');

  // 1. Verificar política atual
  try {
    const result = await execSql(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual
      FROM pg_policies
      WHERE tablename = 'testimonials';
    `);
    console.log('📋 Políticas atuais:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log(`⚠️  Não foi possível verificar políticas: ${e.message}`);
  }

  // 2. Corrigir a política — adicionar TO anon, authenticated
  console.log('\n📝 Aplicando correção...');
  try {
    await execSql(`
      DROP POLICY IF EXISTS "Public can read active testimonials" ON testimonials;
      CREATE POLICY "Public can read active testimonials"
        ON testimonials FOR SELECT TO anon, authenticated
        USING (is_active = true);
    `);
    console.log('✅ Política "Public can read active testimonials" atualizada!');
    console.log('   Agora permite SELECT para anon e authenticated com is_active = true');
  } catch (e) {
    if (e.message.includes('already exists')) {
      // Se já existe, tenta com nome diferente
      try {
        await execSql(`
          DROP POLICY IF EXISTS "Public can read active testimonials" ON testimonials;
          DROP POLICY IF EXISTS "Anyone can read active testimonials" ON testimonials;
          CREATE POLICY "Anyone can read active testimonials"
            ON testimonials FOR SELECT TO anon, authenticated
            USING (is_active = true);
        `);
        console.log('✅ Política "Anyone can read active testimonials" criada!');
      } catch (e2) {
        console.error(`❌ Erro ao criar política alternativa: ${e2.message}`);
        console.log('\n💡 Execute o SQL abaixo manualmente no Supabase SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/dbukdhycfaibdshxnatt/sql/new\n');
        console.log(`
DROP POLICY IF EXISTS "Public can read active testimonials" ON testimonials;
CREATE POLICY "Public can read active testimonials"
  ON testimonials FOR SELECT TO anon, authenticated
  USING (is_active = true);
`);
        return;
      }
    } else {
      console.error(`❌ Erro: ${e.message}`);
      return;
    }
  }

  // 3. Verificar com chave anon
  console.log('\n🔑 Testando com chave ANON...');
  const { createClient } = await import('@supabase/supabase-js');
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTMzNDQsImV4cCI6MjA5Njg2OTM0NH0.dhF4GyQ0JzqLM-BSdD8tdmtr0zstiWJf8gu8Uq4gb9s';
  const anon = createClient(SUPABASE_URL, anonKey);

  const { data, error } = await anon
    .from('testimonials')
    .select('id, name, text, rating')
    .eq('is_active', true);

  if (error) {
    console.log(`❌ Ainda com erro: ${error.message}`);
  } else {
    console.log(`✅ Anon conseguiu ler ${data?.length || 0} depoimentos!`);
    if (data && data.length > 0) {
      for (const t of data) {
        console.log(`   "${t.name}" ⭐${t.rating}`);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(e => console.error('❌', e.message));
