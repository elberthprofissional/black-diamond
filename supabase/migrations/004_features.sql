-- =========================================================================
-- BLACK DIAMOND - 004 - FEATURES
-- =========================================================================
-- Consolidado de: 006_multi_barber.sql, 007_mensalista_reborn.sql, 008_auto_complete_2h_buffer.sql
-- =========================================================================

-- Versao sem REFERENCES auth.users para execucao via Management API.
-- A FK pode ser adicionada manualmente depois.

-- 1. TABELA barbers (sem FK auth.users)
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

CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON barbers(user_id);
CREATE INDEX IF NOT EXISTS idx_barbers_active ON barbers(is_active) WHERE is_active = TRUE;

-- 2. ADICIONAR barber_id NA TABELA bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber_id UUID;
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);

-- 3. ATUALIZAR INDEX UNICO DE DOUBLE-BOOKING
DROP INDEX IF EXISTS idx_no_double_booking;
CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking
    ON bookings(booking_date, booking_time, barber_id)
    WHERE status IN ('pending', 'confirmed') AND barber_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking_legacy
    ON bookings(booking_date, booking_time)
    WHERE status IN ('pending', 'confirmed') AND barber_id IS NULL;

-- 4. TABELA barber_settings (horarios por barbeiro)
CREATE TABLE IF NOT EXISTS barber_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(barber_id, key)
);

CREATE INDEX IF NOT EXISTS idx_barber_settings_barber_id ON barber_settings(barber_id);

-- 5. RLS PARA barbers
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Barbeiros leitura publica" ON barbers;
CREATE POLICY "Barbeiros leitura publica" ON barbers
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Barbeiros gerenciamento admin" ON barbers;
CREATE POLICY "Barbeiros gerenciamento admin" ON barbers
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- 6. RLS PARA barber_settings
ALTER TABLE barber_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Barber settings leitura publica" ON barber_settings;
CREATE POLICY "Barber settings leitura publica" ON barber_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Barber settings gerenciamento admin" ON barber_settings;
CREATE POLICY "Barber settings gerenciamento admin" ON barber_settings
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- 7. RPC: get_barbers
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

-- 8. RPC: get_barber_by_user_id
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

-- 9. RPC: upsert_barber
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

-- 10. RPC: delete_barber
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

-- 11. MIGRAR DADOS DO BARBEIRO SOLO PARA TABELA barbers
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

-- 12. ATUALIZAR TRIGGERS DE NOTIFICACAO (COM MULTI-BARBER)

CREATE OR REPLACE FUNCTION handle_booking_token_inserted()
RETURNS TRIGGER AS $$
DECLARE
    v_booking RECORD;
    v_client RECORD;
    v_service_names text;
    v_formatted_date text;
    v_formatted_price text;
    v_mensalista_tag text := '';
    v_clean_phone text;
    v_site_url text;
    v_manage_url text;
    v_notif_body text;
    v_admin_id uuid;
    v_barber_user_id uuid;
BEGIN
    SELECT * INTO v_booking FROM bookings WHERE id = NEW.booking_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

    SELECT * INTO v_client FROM clients WHERE id = v_booking.client_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

    SELECT string_agg(s.name, ', ' ORDER BY s.name) INTO v_service_names
    FROM services s WHERE s.id = ANY(v_booking.service_ids);

    v_formatted_date := to_char(v_booking.booking_date, 'DD/MM/YYYY') || ' as ' || substring(v_booking.booking_time::text from 1 for 5);
    v_formatted_price := 'R$ ' || replace(to_char(v_booking.total_price, 'FM999990.00'), '.', ',');

    IF v_client.is_mensalista = TRUE AND (v_client.mensalista_expires_at IS NULL OR v_client.mensalista_expires_at >= NOW()) THEN
        v_mensalista_tag := ' [MENSALISTA]';
    END IF;

    v_clean_phone := regexp_replace(v_client.phone, '\D', '', 'g');

    SELECT COALESCE(value, 'https://black-diamond.vercel.app') INTO v_site_url
    FROM settings WHERE key = 'site_url';

    v_manage_url := v_site_url || '/gerenciar?token=' || NEW.token;

    v_notif_body := jsonb_build_object(
        'clientName', TRIM(v_client.name),
        'isMensalista', (v_client.is_mensalista = TRUE AND (v_client.mensalista_expires_at IS NULL OR v_client.mensalista_expires_at >= NOW())),
        'services', COALESCE(v_service_names, 'Servico'),
        'dateTime', v_formatted_date,
        'totalPrice', v_formatted_price,
        'clientPhone', v_clean_phone,
        'manageUrl', v_manage_url
    )::text;

    IF v_booking.barber_id IS NOT NULL THEN
        SELECT user_id INTO v_barber_user_id FROM barbers WHERE id = v_booking.barber_id;

        IF v_barber_user_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (v_barber_user_id, 'Novo Agendamento!', v_notif_body, 'booking-' || NEW.booking_id::text, '/admin');
        END IF;

        FOR v_admin_id IN SELECT user_id FROM admin_users WHERE user_id != v_barber_user_id LOOP
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (v_admin_id, 'Novo Agendamento!', v_notif_body, 'booking-' || NEW.booking_id::text, '/admin');
        END LOOP;
    ELSE
        FOR v_admin_id IN SELECT user_id FROM admin_users LOOP
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (v_admin_id, 'Novo Agendamento!', v_notif_body, 'booking-' || NEW.booking_id::text, '/admin');
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_token_inserted ON booking_tokens;
CREATE TRIGGER trg_booking_token_inserted
AFTER INSERT ON booking_tokens
FOR EACH ROW
EXECUTE FUNCTION handle_booking_token_inserted();

CREATE OR REPLACE FUNCTION handle_booking_cancelled()
RETURNS TRIGGER AS $$
DECLARE
    v_client_name TEXT;
    v_service_names TEXT;
    v_formatted_date TEXT;
    v_formatted_time TEXT;
    v_clean_phone TEXT;
    v_admin_id UUID;
    v_barber_user_id UUID;
BEGIN
    IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

    SELECT name, phone INTO v_client_name, v_clean_phone
    FROM clients WHERE id = NEW.client_id;

    SELECT string_agg(s.name, ', ' ORDER BY s.name) INTO v_service_names
    FROM services s WHERE s.id = ANY(NEW.service_ids);

    v_formatted_date := to_char(NEW.booking_date, 'DD/MM/YYYY');
    v_formatted_time := substring(NEW.booking_time::text from 1 for 5);

    IF v_clean_phone IS NOT NULL THEN
        v_clean_phone := regexp_replace(v_clean_phone, '\D', '', 'g');
    END IF;

    DELETE FROM notifications WHERE tag = 'booking-' || NEW.id::text;

    IF NEW.barber_id IS NOT NULL THEN
        SELECT user_id INTO v_barber_user_id FROM barbers WHERE id = NEW.barber_id;

        IF v_barber_user_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (
                v_barber_user_id,
                'Agendamento Cancelado',
                jsonb_build_object(
                    'clientName', COALESCE(v_client_name, 'Cliente'),
                    'services', COALESCE(v_service_names, 'Servico'),
                    'dateTime', v_formatted_date || ' as ' || v_formatted_time,
                    'totalPrice', 'R$ ' || replace(to_char(NEW.total_price, 'FM999990.00'), '.', ','),
                    'clientPhone', COALESCE(v_clean_phone, '---'),
                    'manageUrl', 'Cancelado'
                )::text,
                'cancelled-' || NEW.id::text,
                '/admin/agendamentos'
            );
        END IF;

        FOR v_admin_id IN SELECT user_id FROM admin_users WHERE user_id != v_barber_user_id LOOP
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (
                v_admin_id,
                'Agendamento Cancelado',
                jsonb_build_object(
                    'clientName', COALESCE(v_client_name, 'Cliente'),
                    'services', COALESCE(v_service_names, 'Servico'),
                    'dateTime', v_formatted_date || ' as ' || v_formatted_time,
                    'totalPrice', 'R$ ' || replace(to_char(NEW.total_price, 'FM999990.00'), '.', ','),
                    'clientPhone', COALESCE(v_clean_phone, '---'),
                    'manageUrl', 'Cancelado'
                )::text,
                'cancelled-' || NEW.id::text,
                '/admin/agendamentos'
            );
        END LOOP;
    ELSE
        FOR v_admin_id IN SELECT user_id FROM admin_users LOOP
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (
                v_admin_id,
                'Agendamento Cancelado',
                jsonb_build_object(
                    'clientName', COALESCE(v_client_name, 'Cliente'),
                    'services', COALESCE(v_service_names, 'Servico'),
                    'dateTime', v_formatted_date || ' as ' || v_formatted_time,
                    'totalPrice', 'R$ ' || replace(to_char(NEW.total_price, 'FM999990.00'), '.', ','),
                    'clientPhone', COALESCE(v_clean_phone, '---'),
                    'manageUrl', 'Cancelado'
                )::text,
                'cancelled-' || NEW.id::text,
                '/admin/agendamentos'
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_status_cancelled ON bookings;
CREATE TRIGGER trg_booking_status_cancelled
AFTER UPDATE OF status ON bookings
FOR EACH ROW
WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
EXECUTE FUNCTION handle_booking_cancelled();

-- 13. HEALTH CHECK ATUALIZADO (v3.22.0)
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
    RETURN jsonb_build_object('status', v_status, 'timestamp', NOW(), 'version', '3.23.0',
        'database', jsonb_build_object('services', v_s, 'bookings', v_b, 'clients', v_c, 'barbers', v_b2),
        'uptime', EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time()))::integer);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 14. REMOVER MENSALISTA PLANS (antiga migration 007)
-- A UI de gerenciamento de planos mensalistas foi removida.
-- Remove a tabela obsoleta e ajusta a foreign key em clients.
-- A flag is_mensalista em clients ainda é funcional (toggle manual).

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_mensalista_plan_id_fkey;
DROP INDEX IF EXISTS idx_mensalista_plans_active;
DROP POLICY IF EXISTS "Mensalista plans leitura publica" ON mensalista_plans;
DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;
DROP TABLE IF EXISTS mensalista_plans CASCADE;
DROP FUNCTION IF EXISTS verificar_mensalistas CASCADE;

-- Recria a tabela mensalista_plans, RLS, funcoes RPC e cron de verificacao.
-- A migration 006 removeu a tabela original por falta de UI.
-- Agora a UI e completa com CRUD, badge, booking inteligente e notificacoes.

-- 1. RECRIAR TABELA mensalista_plans
CREATE TABLE IF NOT EXISTS mensalista_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    included_service_ids UUID[] DEFAULT '{}',
    allowed_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',
    duration_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate foreign key from clients
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_mensalista_plan_id_fkey;
ALTER TABLE clients ADD CONSTRAINT clients_mensalista_plan_id_fkey
    FOREIGN KEY (mensalista_plan_id) REFERENCES mensalista_plans(id) ON DELETE SET NULL;

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_mensalista_plans_active ON mensalista_plans(is_active) WHERE is_active;

-- 3. RLS
ALTER TABLE mensalista_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mensalista plans leitura publica" ON mensalista_plans;
CREATE POLICY "Mensalista plans leitura publica" ON mensalista_plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;
CREATE POLICY "Mensalista plans admin" ON mensalista_plans
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- 4. RPC: get_mensalista_plans
CREATE OR REPLACE FUNCTION get_mensalista_plans()
RETURNS TABLE (
    id UUID,
    name TEXT,
    price DECIMAL,
    included_service_ids UUID[],
    allowed_days INTEGER[],
    duration_days INTEGER,
    is_active BOOLEAN,
    is_default BOOLEAN,
    sort_order INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT mp.id, mp.name, mp.price, mp.included_service_ids, mp.allowed_days,
           mp.duration_days, mp.is_active, mp.is_default, mp.sort_order, mp.created_at
    FROM mensalista_plans mp
    WHERE mp.is_active = TRUE
    ORDER BY mp.sort_order ASC, mp.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. RPC: upsert_mensalista_plan
CREATE OR REPLACE FUNCTION upsert_mensalista_plan(
    p_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_price DECIMAL DEFAULT NULL,
    p_included_service_ids UUID[] DEFAULT NULL,
    p_allowed_days INTEGER[] DEFAULT NULL,
    p_duration_days INTEGER DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL,
    p_is_default BOOLEAN DEFAULT NULL,
    p_sort_order INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_plan_id UUID;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem gerenciar planos mensalistas';
    END IF;

    IF p_id IS NOT NULL THEN
        UPDATE mensalista_plans SET
            name = COALESCE(p_name, name),
            price = COALESCE(p_price, price),
            included_service_ids = COALESCE(p_included_service_ids, included_service_ids),
            allowed_days = COALESCE(p_allowed_days, allowed_days),
            duration_days = COALESCE(p_duration_days, duration_days),
            is_active = COALESCE(p_is_active, is_active),
            is_default = COALESCE(p_is_default, is_default),
            sort_order = COALESCE(p_sort_order, sort_order)
        WHERE id = p_id
        RETURNING id INTO v_plan_id;
    ELSE
        INSERT INTO mensalista_plans (name, price, included_service_ids, allowed_days, duration_days, is_active, is_default, sort_order)
        VALUES (p_name, p_price, p_included_service_ids, p_allowed_days, p_duration_days, p_is_active, p_is_default, p_sort_order)
        RETURNING id INTO v_plan_id;
    END IF;

    RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: delete_mensalista_plan
CREATE OR REPLACE FUNCTION delete_mensalista_plan(p_plan_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem remover planos mensalistas';
    END IF;

    -- Set clients with this plan to null
    UPDATE clients SET mensalista_plan_id = NULL, is_mensalista = FALSE
    WHERE mensalista_plan_id = p_plan_id;

    DELETE FROM mensalista_plans WHERE id = p_plan_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ATUALIZAR FUNCAO criar_agendamento PARA USAR NOVA TABELA
-- A funcao criar_agendamento ja referencia mensalista_plans,
-- entao ela voltara a funcionar automaticamente com a tabela recriada.
-- A query em criar_agendamento que faz:
--   SELECT included_service_ids FROM mensalista_plans WHERE id = v_plan_id AND is_active = TRUE
-- agora funcionara novamente.

-- 8. RECRIAR verificar_mensalistas COM NOTIFICACOES IN-APP
CREATE OR REPLACE FUNCTION verificar_mensalistas()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_client RECORD;
    v_title TEXT;
    v_body TEXT;
    v_tag TEXT;
    v_days INTEGER;
    v_admin_id UUID;
BEGIN
    -- Notify about expiring memberships (3 days or less)
    FOR v_client IN SELECT c.id, c.name, c.mensalista_expires_at, mp.name as plan_name
    FROM clients c
    LEFT JOIN mensalista_plans mp ON mp.id = c.mensalista_plan_id
    WHERE c.is_mensalista = true
    AND c.mensalista_expires_at IS NOT NULL
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

        -- Create in-app notifications for all admins
        FOR v_admin_id IN SELECT user_id FROM admin_users LOOP
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (v_admin_id, v_title, v_body, v_tag, '/admin/clients');
        END LOOP;
    END LOOP;

    -- Auto-expire memberships that have passed
    UPDATE clients SET
        is_mensalista = false,
        mensalista_plan_id = NULL,
        mensalista_expires_at = NULL
    WHERE is_mensalista = true
    AND mensalista_expires_at IS NOT NULL
    AND mensalista_expires_at < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
END;
$$;

-- 9. CRON: verificar mensalistas diariamente as 8h
SELECT cron.schedule('verificar-mensalistas', '0 8 * * *', $$ SELECT verificar_mensalistas() $$);

-- 10. SETTING: mensalista_enabled = true (default)
INSERT INTO settings (key, value) VALUES ('mensalista_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Ao inves de marcar como 'completed', marca como 'cancelled' para bookings
-- do dia atual. Isso evita inflar faturamento com servicos que nao foram
-- realizados. O barbeiro tem 2h pra finalizar manualmente; se esquecer,
-- o booking eh cancelado (nao completado) pra nao mentir nos dados.

CREATE OR REPLACE FUNCTION completar_agendamentos_expirados()
RETURNS void AS $$
DECLARE v_agora_brt timestamp;
BEGIN
    v_agora_brt := NOW() AT TIME ZONE 'America/Sao_Paulo';

    -- Dias anteriores: marca como completed (cleanup de dias passados)
    UPDATE bookings SET status = 'completed'
    WHERE booking_date < v_agora_brt::date
      AND status IN ('confirmed', 'pending')
      AND is_blocked = FALSE;

    -- Hoje: marca como 'cancelled' apos 2h (nao sabemos se o cliente veio)
    -- O barbeiro ainda pode reverter manualmente no historico
    UPDATE bookings SET status = 'cancelled'
    WHERE booking_date = v_agora_brt::date
      AND status IN ('confirmed', 'pending')
      AND is_blocked = FALSE
      AND (booking_time + INTERVAL '2 hours') < v_agora_brt::time;

    -- Bloqueios de dias anteriores: limpa
    UPDATE bookings SET is_blocked = FALSE, status = 'cancelled'
    WHERE booking_date < v_agora_brt::date
      AND is_blocked = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;