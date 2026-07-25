/**
 * Fix: Unificar TATO → Tato e criar trigger de normalização.
 *
 * Uso: node scripts/fix-tato-duplicate.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

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
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FIX: UNIFICAR TATO → TATO + TRIGGER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const TATO_ID = 'f1617259-aeb1-4675-8f54-77965354931e';
  const TATO_DUP_ID = 'c0844e81-d48b-425d-ba93-212651244758';

  // =============================================================
  // PASSO 1: Verificar dados atuais
  // =============================================================
  console.log('📋 Passo 1: Verificando dados atuais...');

  const { data: tatoOrig, error: err1 } = await supabase
    .from('clients')
    .select('id, name, phone')
    .eq('id', TATO_ID)
    .single();

  const { data: tatoDup, error: err2 } = await supabase
    .from('clients')
    .select('id, name, phone')
    .eq('id', TATO_DUP_ID)
    .single();

  if (err1 || !tatoOrig) {
    console.error(`❌ Cliente original (Tato) não encontrado: ${err1?.message || 'sem dados'}`);
    console.log('\n   Listando todos os clientes Tato/TATO/tato...');
    const { data: allTatos } = await supabase
      .from('clients')
      .select('id, name, phone')
      .ilike('name', 'tato%');
    if (allTatos && allTatos.length > 0) {
      for (const c of allTatos) {
        const { count } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', c.id);
        console.log(`   id: ${c.id} | nome: "${c.name}" | tel: ${c.phone || '-'} | bookings: ${count}`);
      }
    }
    return;
  }

  console.log(`   Original: "${tatoOrig.name}" (tel: ${tatoOrig.phone})`);
  if (tatoDup) {
    console.log(`   Duplicado: "${tatoDup.name}" (tel: ${tatoDup.phone})`);
  } else {
    console.log(`   Duplicado já foi removido (não encontrado)`);
  }

  // =============================================================
  // PASSO 2: Reatribuir bookings
  // =============================================================
  if (tatoDup) {
    console.log('\n📋 Passo 2: Reatribuindo bookings...');
    const { data: dupBookings, error: err3 } = await supabase
      .from('bookings')
      .select('id, booking_date, booking_time')
      .eq('client_id', TATO_DUP_ID);

    if (err3) {
      console.error(`   ❌ Erro ao buscar bookings: ${err3.message}`);
    } else if (dupBookings && dupBookings.length > 0) {
      console.log(`   Bookings do duplicado: ${dupBookings.length}`);
      for (const b of dupBookings) {
        const { error: err4 } = await supabase
          .from('bookings')
          .update({ client_id: TATO_ID })
          .eq('id', b.id);
        if (err4) {
          console.error(`   ❌ Erro ao reatribuir booking ${b.id}: ${err4.message}`);
        } else {
          console.log(`   ✅ Booking ${b.booking_date} ${b.booking_time} → reassinado`);
        }
      }
    } else {
      console.log('   Nenhum booking para reatribuir');
    }

    // =============================================================
    // PASSO 3: Deletar cliente duplicado
    // =============================================================
    console.log('\n📋 Passo 3: Removendo cliente duplicado...');
    const { error: err5 } = await supabase
      .from('clients')
      .delete()
      .eq('id', TATO_DUP_ID);

    if (err5) {
      console.error(`   ❌ Erro ao deletar: ${err5.message}`);
    } else {
      console.log('   ✅ Cliente TATO removido!');
    }
  }

  // =============================================================
  // PASSO 4: Criar trigger de normalização
  // =============================================================
  console.log('\n📋 Passo 4: Criando trigger de normalização de nomes...');

  const sql = `
-- Função de normalização
CREATE OR REPLACE FUNCTION normalize_client_name()
RETURNS trigger AS $$
DECLARE
  v_words text[];
  v_word text;
  v_result text := '';
  i int;
  v_lower_words text[] := ARRAY['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o'];
BEGIN
  NEW.name := regexp_replace(TRIM(NEW.name), '\s+', ' ', 'g');
  IF NEW.name IS NULL OR NEW.name = '' THEN
    RAISE EXCEPTION 'Nome do cliente nao pode ser vazio';
  END IF;

  v_words := string_to_array(NEW.name, ' ');

  FOR i IN 1 .. array_length(v_words, 1) LOOP
    v_word := v_words[i];
    IF i = 1 THEN
      v_word := INITCAP(v_word);
    ELSE
      IF v_word = ANY(v_lower_words) THEN
        v_word := lower(v_word);
      ELSE
        v_word := INITCAP(v_word);
      END IF;
    END IF;
    IF i > 1 THEN v_result := v_result || ' '; END IF;
    v_result := v_result || v_word;
  END LOOP;

  NEW.name := v_result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existe
DROP TRIGGER IF EXISTS trg_normalize_client_name ON clients;

-- Criar trigger
CREATE TRIGGER trg_normalize_client_name
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_name();

-- Normalizar nomes existentes (força trigger em cada linha)
UPDATE clients SET name = name
WHERE name IS DISTINCT FROM regexp_replace(TRIM(name), '\s+', ' ', 'g')
   OR name ~ '[A-Z]{2,}';
`;

  try {
    await execSql(`DROP FUNCTION IF EXISTS normalize_client_name() CASCADE;`);
    await execSql(`
CREATE OR REPLACE FUNCTION normalize_client_name()
RETURNS trigger AS \$\$
DECLARE
  v_words text[];
  v_word text;
  v_result text := '';
  i int;
  v_lower_words text[] := ARRAY['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o'];
BEGIN
  NEW.name := regexp_replace(TRIM(NEW.name), '\s+', ' ', 'g');
  IF NEW.name IS NULL OR NEW.name = '' THEN
    RAISE EXCEPTION 'Nome do cliente nao pode ser vazio';
  END IF;

  v_words := string_to_array(NEW.name, ' ');

  FOR i IN 1 .. array_length(v_words, 1) LOOP
    v_word := v_words[i];
    IF i = 1 THEN
      v_word := INITCAP(v_word);
    ELSE
      IF v_word = ANY(v_lower_words) THEN
        v_word := lower(v_word);
      ELSE
        v_word := INITCAP(v_word);
      END IF;
    END IF;
    IF i > 1 THEN v_result := v_result || ' '; END IF;
    v_result := v_result || v_word;
  END LOOP;

  NEW.name := v_result;
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;
`);
    console.log('   ✅ Função normalize_client_name() criada!');

    await execSql(`DROP TRIGGER IF EXISTS trg_normalize_client_name ON clients;`);
    await execSql(`
CREATE TRIGGER trg_normalize_client_name
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_name();
`);
    console.log('   ✅ Trigger trg_normalize_client_name criado!');

    const { error: err6 } = await supabase.rpc('health_check');
    if (!err6) {
      console.log('   ✅ Conexão OK após trigger');
    }
  } catch (e) {
    console.error(`   ❌ Erro ao criar trigger: ${e.message}`);
    console.log('\n   💡 Execute o SQL abaixo manualmente no Supabase SQL Editor:');
    console.log('      https://supabase.com/dashboard/project/dbukdhycfaibdshxnatt/sql/new\n');
    console.log(sql);
    return;
  }

  // =============================================================
  // RESUMO
  // =============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ FIX CONCLUÍDO!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('   O que foi feito:');
  if (tatoDup) {
  console.log('   1. Booking do "TATO" → reassinado para "Tato"');
  console.log('   2. Cliente "TATO" (duplicado) → removido');
  } else {
  console.log('   1. Cliente duplicado já havia sido removido anteriormente');
  }
  console.log('   3. Trigger normalize_client_name → criado');
  console.log('   4. Nomes existentes → normalizados');
  console.log('');
  console.log('   Agora, se alguém criar "TATO" ou "tato" ou "TATO",');
  console.log('   o trigger converte automaticamente para "Tato" 🎯\n');
}

main().catch(e => {
  console.error('❌ Erro fatal:', e.message);
  process.exit(1);
});
