import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Separa o SQL em blocos para executar individualmente
async function executeSQL(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql });
  if (error) {
    console.error(`❌ Erro: ${error.message}`);
    return false;
  }
  console.log(`✅ OK: ${data || 'sucesso'}`);
  return true;
}

async function main() {
  console.log('🚀 Iniciando migration 008 - Multi-Barber (adaptada)\n');

  // =============================================
  // 1. Criar tabela barbers (sem FK auth.users)
  // =============================================
  console.log('1. Criando tabela barbers...');
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS barbers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        name TEXT NOT NULL,
        phone TEXT,
        photo_url TEXT,
        bio TEXT,
        quote TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        is_owner BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // =============================================
  // 2. Indexes
  // =============================================
  console.log('2. Criando indexes...');
  await executeSQL(`CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON barbers(user_id);`);
  await executeSQL(`CREATE INDEX IF NOT EXISTS idx_barbers_active ON barbers(is_active) WHERE is_active = TRUE;`);

  // =============================================
  // 3. Adicionar barber_id em bookings
  // =============================================
  console.log('3. Adicionando barber_id em bookings...');
  await executeSQL(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber_id UUID;`);
  await executeSQL(`CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);`);

  // =============================================
  // 4. Atualizar indice de double-booking
  // =============================================
  console.log('4. Atualizando indice de double-booking...');
  await executeSQL(`DROP INDEX IF EXISTS idx_no_double_booking;`);
  await executeSQL(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking
        ON bookings(booking_date, booking_time, barber_id)
        WHERE status IN ('pending', 'confirmed') AND barber_id IS NOT NULL;
  `);
  await executeSQL(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking_legacy
        ON bookings(booking_date, booking_time)
        WHERE status IN ('pending', 'confirmed') AND barber_id IS NULL;
  `);

  // =============================================
  // 5. Criar barber_settings
  // =============================================
  console.log('5. Criando barber_settings...');
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS barber_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        barber_id UUID NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(barber_id, key)
    );
  `);
  await executeSQL(`CREATE INDEX IF NOT EXISTS idx_barber_settings_barber_id ON barber_settings(barber_id);`);

  // =============================================
  // 6. RLS
  // =============================================
  console.log('6. Configurando RLS...');

  // barbers
  await executeSQL(`ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;`);
  await executeSQL(`
    DROP POLICY IF EXISTS "Barbeiros leitura publica" ON barbers;
    CREATE POLICY "Barbeiros leitura publica" ON barbers
        FOR SELECT USING (is_active = TRUE);
  `);
  await executeSQL(`
    DROP POLICY IF EXISTS "Barbeiros gerenciamento admin" ON barbers;
    CREATE POLICY "Barbeiros gerenciamento admin" ON barbers
        FOR ALL TO authenticated
        USING (is_admin())
        WITH CHECK (is_admin());
  `);

  // barber_settings
  await executeSQL(`ALTER TABLE barber_settings ENABLE ROW LEVEL SECURITY;`);
  await executeSQL(`
    DROP POLICY IF EXISTS "Barber settings leitura publica" ON barber_settings;
    CREATE POLICY "Barber settings leitura publica" ON barber_settings
        FOR SELECT USING (true);
  `);
  await executeSQL(`
    DROP POLICY IF EXISTS "Barber settings gerenciamento admin" ON barber_settings;
    CREATE POLICY "Barber settings gerenciamento admin" ON barber_settings
        FOR ALL TO authenticated
        USING (is_admin())
        WITH CHECK (is_admin());
  `);

  // =============================================
  // 7. RPCs
  // =============================================
  console.log('7. Criando RPCs...');

  await executeSQL(`
    CREATE OR REPLACE FUNCTION get_barbers()
    RETURNS TABLE (
        id UUID,
        user_id UUID,
        name TEXT,
        phone TEXT,
        photo_url TEXT,
        bio TEXT,
        quote TEXT,
        is_active BOOLEAN,
        is_owner BOOLEAN,
        sort_order INTEGER,
        created_at TIMESTAMPTZ
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT b.id, b.user_id, b.name, b.phone, b.photo_url, b.bio, b.quote,
               b.is_active, b.is_owner, b.sort_order, b.created_at
        FROM barbers b
        WHERE b.is_active = TRUE
        ORDER BY b.sort_order ASC, b.name ASC;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
  `);

  await executeSQL(`
    CREATE OR REPLACE FUNCTION get_barber_by_user_id(p_user_id UUID)
    RETURNS TABLE (
        id UUID,
        name TEXT,
        phone TEXT,
        photo_url TEXT,
        bio TEXT,
        quote TEXT,
        is_owner BOOLEAN
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT b.id, b.name, b.phone, b.photo_url, b.bio, b.quote, b.is_owner
        FROM barbers b
        WHERE b.user_id = p_user_id AND b.is_active = TRUE
        LIMIT 1;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
  `);

  await executeSQL(`
    CREATE OR REPLACE FUNCTION upsert_barber(
        p_id UUID DEFAULT NULL,
        p_user_id UUID DEFAULT NULL,
        p_name TEXT DEFAULT NULL,
        p_phone TEXT DEFAULT NULL,
        p_photo_url TEXT DEFAULT NULL,
        p_bio TEXT DEFAULT NULL,
        p_quote TEXT DEFAULT NULL,
        p_is_active BOOLEAN DEFAULT TRUE,
        p_is_owner BOOLEAN DEFAULT FALSE,
        p_sort_order INTEGER DEFAULT 0
    )
    RETURNS UUID AS $$
    DECLARE
        v_barber_id UUID;
    BEGIN
        IF NOT is_admin() THEN
            RAISE EXCEPTION 'Apenas administradores podem gerenciar barbeiros';
        END IF;

        IF p_id IS NOT NULL THEN
            UPDATE barbers SET
                name = COALESCE(p_name, name),
                phone = COALESCE(p_phone, phone),
                photo_url = COALESCE(p_photo_url, photo_url),
                bio = COALESCE(p_bio, bio),
                quote = COALESCE(p_quote, quote),
                is_active = COALESCE(p_is_active, is_active),
                is_owner = COALESCE(p_is_owner, is_owner),
                sort_order = COALESCE(p_sort_order, sort_order)
            WHERE id = p_id
            RETURNING id INTO v_barber_id;
        ELSE
            INSERT INTO barbers (user_id, name, phone, photo_url, bio, quote, is_active, is_owner, sort_order)
            VALUES (p_user_id, p_name, p_phone, p_photo_url, p_bio, p_quote, p_is_active, p_is_owner, p_sort_order)
            RETURNING id INTO v_barber_id;
        END IF;

        RETURN v_barber_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  await executeSQL(`
    CREATE OR REPLACE FUNCTION delete_barber(p_barber_id UUID, p_hard BOOLEAN DEFAULT FALSE)
    RETURNS BOOLEAN AS $$
    BEGIN
        IF NOT is_admin() THEN
            RAISE EXCEPTION 'Apenas administradores podem remover barbeiros';
        END IF;

        IF p_hard THEN
            DELETE FROM barbers WHERE id = p_barber_id AND is_owner = FALSE;
        ELSE
            UPDATE barbers SET is_active = FALSE WHERE id = p_barber_id AND is_owner = FALSE;
        END IF;

        RETURN TRUE;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  // =============================================
  // 8. Migrar dados do admin atual
  // =============================================
  console.log('8. Migrando dados do admin para tabela barbers...');
  await executeSQL(`
    DO $$
    DECLARE
        v_barber_name TEXT;
        v_barber_phone TEXT;
        v_barber_bio TEXT;
        v_barber_quote TEXT;
        v_barber_photo TEXT;
        v_owner_id UUID;
    BEGIN
        SELECT value INTO v_barber_name FROM settings WHERE key = 'barber_name';
        SELECT value INTO v_barber_phone FROM settings WHERE key = 'barber_phone';
        SELECT value INTO v_barber_bio FROM settings WHERE key = 'barber_bio';
        SELECT value INTO v_barber_quote FROM settings WHERE key = 'barber_quote';
        SELECT value INTO v_barber_photo FROM settings WHERE key = 'barber_photo';
        SELECT user_id INTO v_owner_id FROM admin_users LIMIT 1;

        IF NOT EXISTS (SELECT 1 FROM barbers WHERE is_owner = TRUE) THEN
            INSERT INTO barbers (user_id, name, phone, photo_url, bio, quote, is_active, is_owner, sort_order)
            VALUES (
                v_owner_id,
                COALESCE(v_barber_name, 'Barbeiro'),
                v_barber_phone,
                v_barber_photo,
                COALESCE(v_barber_bio, 'Acredito que a barbearia é um dos poucos lugares onde o homem pode relaxar de verdade.'),
                COALESCE(v_barber_quote, 'Não sou o melhor, mas sou o melhor para você.'),
                TRUE,
                TRUE,
                0
            );
        END IF;
    END $$;
  `);

  // =============================================
  // 9. Health check
  // =============================================
  console.log('9. Atualizando health_check...');
  await executeSQL(`
    CREATE OR REPLACE FUNCTION health_check()
    RETURNS jsonb AS $$
    DECLARE v_status TEXT := 'ok'; v_s INTEGER; v_b INTEGER; v_c INTEGER; v_b2 INTEGER;
    BEGIN
        BEGIN
            SELECT COUNT(*) INTO v_s FROM services;
            SELECT COUNT(*) INTO v_b FROM bookings;
            SELECT COUNT(*) INTO v_c FROM clients;
            SELECT COUNT(*) INTO v_b2 FROM barbers;
        EXCEPTION WHEN OTHERS THEN v_status := 'error'; END;
        RETURN jsonb_build_object('status', v_status, 'timestamp', NOW(), 'version', '3.22.0',
            'database', jsonb_build_object('services', v_s, 'bookings', v_b, 'clients', v_c, 'barbers', v_b2),
            'uptime', EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time()))::integer);
    END;
    $$ LANGUAGE plpgsql SECURITY INVOKER;
  `);

  console.log('\n✅ Migration 008 concluída!');
  console.log('⚠️  Nota: A FK para auth.users foi removida propositalmente.');
  console.log('   O Management API não tem acesso ao schema auth.');
  console.log('   A FK pode ser adicionada manualmente no SQL Editor do Supabase:');
  console.log('   ALTER TABLE barbers ADD CONSTRAINT fk_barbers_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;');
}

main().catch(console.error);
