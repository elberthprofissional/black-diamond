/**
 * Migration: Recreate mensalista_plans system
 * 
 * Uso: node scripts/run-migration-mensalista.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://dbukdhycfaibdshxnatt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql });
  if (error) {
    console.error(`❌ Erro: ${error.message}`);
    return false;
  }
  console.log(`✅ OK: ${data || 'sucesso'}`);
  return true;
}

const statements = [
  // 1. Create table
  `CREATE TABLE IF NOT EXISTS mensalista_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    included_service_ids UUID[] DEFAULT '{}',
    allowed_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',
    duration_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 2. Foreign key from clients
  `ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_mensalista_plan_id_fkey;`,
  `ALTER TABLE clients ADD CONSTRAINT clients_mensalista_plan_id_fkey
    FOREIGN KEY (mensalista_plan_id) REFERENCES mensalista_plans(id) ON DELETE SET NULL;`,

  // 3. Index
  `CREATE INDEX IF NOT EXISTS idx_mensalista_plans_active ON mensalista_plans(is_active) WHERE is_active;`,

  // 4. RLS
  `ALTER TABLE mensalista_plans ENABLE ROW LEVEL SECURITY;`,
  `DROP POLICY IF EXISTS "Mensalista plans leitura publica" ON mensalista_plans;
   CREATE POLICY "Mensalista plans leitura publica" ON mensalista_plans
    FOR SELECT USING (true);`,
  `DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;
   CREATE POLICY "Mensalista plans admin" ON mensalista_plans
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());`,

  // 5. RPC: get_mensalista_plans
  `CREATE OR REPLACE FUNCTION get_mensalista_plans()
  RETURNS TABLE (
    id UUID, name TEXT, price DECIMAL,
    included_service_ids UUID[], allowed_days INTEGER[],
    duration_days INTEGER, is_active BOOLEAN, is_default BOOLEAN,
    sort_order INTEGER, created_at TIMESTAMPTZ
  ) AS $$
  BEGIN
    RETURN QUERY SELECT mp.id, mp.name, mp.price, mp.included_service_ids,
      mp.allowed_days, mp.duration_days, mp.is_active, mp.is_default,
      mp.sort_order, mp.created_at
    FROM mensalista_plans mp
    WHERE mp.is_active = TRUE
    ORDER BY mp.sort_order ASC, mp.name ASC;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;`,

  // 6. RPC: upsert_mensalista_plan
  `CREATE OR REPLACE FUNCTION upsert_mensalista_plan(
    p_id UUID DEFAULT NULL, p_name TEXT DEFAULT NULL,
    p_price DECIMAL DEFAULT NULL, p_included_service_ids UUID[] DEFAULT NULL,
    p_allowed_days INTEGER[] DEFAULT NULL, p_duration_days INTEGER DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL, p_is_default BOOLEAN DEFAULT NULL,
    p_sort_order INTEGER DEFAULT NULL
  ) RETURNS UUID AS $$
  DECLARE v_plan_id UUID;
  BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem gerenciar planos mensalistas'; END IF;
    IF p_id IS NOT NULL THEN
      UPDATE mensalista_plans SET
        name = COALESCE(p_name, name), price = COALESCE(p_price, price),
        included_service_ids = COALESCE(p_included_service_ids, included_service_ids),
        allowed_days = COALESCE(p_allowed_days, allowed_days),
        duration_days = COALESCE(p_duration_days, duration_days),
        is_active = COALESCE(p_is_active, is_active),
        is_default = COALESCE(p_is_default, is_default),
        sort_order = COALESCE(p_sort_order, sort_order)
      WHERE id = p_id RETURNING id INTO v_plan_id;
    ELSE
      INSERT INTO mensalista_plans (name, price, included_service_ids, allowed_days, duration_days, is_active, is_default, sort_order)
      VALUES (p_name, p_price, p_included_service_ids, p_allowed_days, p_duration_days, p_is_active, p_is_default, p_sort_order)
      RETURNING id INTO v_plan_id;
    END IF;
    RETURN v_plan_id;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;`,

  // 7. RPC: delete_mensalista_plan
  `CREATE OR REPLACE FUNCTION delete_mensalista_plan(p_plan_id UUID)
  RETURNS BOOLEAN AS $$
  BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem remover planos mensalistas'; END IF;
    UPDATE clients SET mensalista_plan_id = NULL, is_mensalista = FALSE WHERE mensalista_plan_id = p_plan_id;
    DELETE FROM mensalista_plans WHERE id = p_plan_id;
    RETURN FOUND;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;`,

  // 8. verificar_mensalistas function
  `CREATE OR REPLACE FUNCTION verificar_mensalistas()
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE
    v_client RECORD; v_title TEXT; v_body TEXT; v_tag TEXT; v_days INTEGER; v_admin_id UUID;
  BEGIN
    FOR v_client IN SELECT c.id, c.name, c.mensalista_expires_at, mp.name as plan_name
    FROM clients c LEFT JOIN mensalista_plans mp ON mp.id = c.mensalista_plan_id
    WHERE c.is_mensalista = true AND c.mensalista_expires_at IS NOT NULL
    AND c.mensalista_expires_at <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date + 3
    AND c.mensalista_expires_at >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    LOOP
      v_days := v_client.mensalista_expires_at - (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
      IF v_days = 0 THEN
        v_title := 'Mensalidade vence hoje!';
        v_body := format('A mensalidade de %s (%s) vence hoje!', v_client.name, v_client.plan_name);
        v_tag := format('mensalidade-hoje-%s', v_client.id);
      ELSIF v_days = 1 THEN
        v_title := 'Mensalidade vence amanha!';
        v_body := format('A mensalidade de %s (%s) vence amanha!', v_client.name, v_client.plan_name);
        v_tag := format('mensalidade-alerta-%s', v_client.id);
      ELSE
        v_title := 'Mensalidade perto de vencer';
        v_body := format('A mensalidade de %s (%s) vence em %s dias!', v_client.name, v_client.plan_name, v_days);
        v_tag := format('mensalidade-alerta-%s', v_client.id);
      END IF;
      FOR v_admin_id IN SELECT user_id FROM admin_users LOOP
        INSERT INTO notifications (user_id, title, body, tag, url)
        VALUES (v_admin_id, v_title, v_body, v_tag, '/admin/clients');
      END LOOP;
    END LOOP;
    UPDATE clients SET is_mensalista = false, mensalista_plan_id = NULL, mensalista_expires_at = NULL
    WHERE is_mensalista = true AND mensalista_expires_at IS NOT NULL
    AND mensalista_expires_at < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
  END;
  $$;`,

  // 9. Cron job
  `SELECT cron.schedule('verificar-mensalistas', '0 8 * * *', $$ SELECT verificar_mensalistas() $$);`,

  // 10. Setting
  `INSERT INTO settings (key, value) VALUES ('mensalista_enabled', 'true') ON CONFLICT (key) DO NOTHING;`,
];

async function main() {
  console.log('='.repeat(60));
  console.log('  MENSALISTA REBORN MIGRATION');
  console.log('='.repeat(60));
  console.log(`🔗 ${supabaseUrl}\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ').trim();
    console.log(`\n📋 Step ${i + 1}/${statements.length}: ${preview}...`);
    const ok = await executeSQL(stmt);
    if (ok) success++;
    else failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ ${success} steps completed`);
  if (failed > 0) console.log(`⚠️  ${failed} steps failed`);
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});
