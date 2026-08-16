-- =========================================================================
-- BLACK DIAMOND - 002 MULTI BARBER PAGAMENTOS
-- MULTI-BARBEIRO + ASSINATURAS/PIX
-- =========================================================================
-- Consolidado de: 003_features_fixes.sql, 004_subscriptions_pix.sql
-- Unificado na consolidação 2026-08-15 — conteúdo preservado na ordem
-- original de execução (idempotente, CREATE OR REPLACE / IF NOT EXISTS).
-- =========================================================================

-- >>> MIGRATION: 003_features_fixes.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 003 - FEATURES + FIXES
-- =========================================================================
-- Consolidado de: 004_features.sql, 005_fixes.sql
-- Multi-barbeiro (barbers, barber_settings), mensalista_plans, correções de RPCs e notificações.
-- =========================================================================


-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 004_features.sql <<<
-- ──────────────────────────────────────────────────────────────
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

-- 4. (removido) Tabela barber_settings foi dropada na limpeza — o app usa
-- settings.barber_hours e barbers.barber_hours (ver migrations 015+).

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

-- 6. (removido) RLS de barber_settings — tabela dropada na limpeza.

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

    SELECT COALESCE(value, 'https://black-diamond-wheat.vercel.app') INTO v_site_url
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

-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 005_fixes.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 005 - FIXES
-- =========================================================================
-- Consolidado de: 009_remove_no_show_block.sql, 010_fix_rpc_functions.sql, 010_fix_notification_format.sql
-- =========================================================================

-- Ao inves de BLOQUEAR o cliente quando atinge o limite de faltas,
-- o sistema apenas NOTIFICA o barbeiro com um atalho pra chamar o
-- cliente no WhatsApp. O barbeiro decide se quer conversar ou nao.
-- Cliente bloqueado = cliente perdido. Melhor recuperar do que punir.

-- Remove o bloqueio na funcao de criacao de agendamento
CREATE OR REPLACE FUNCTION check_client_no_show_block(p_client_id uuid)
RETURNS void AS $$
BEGIN
    -- Nao bloqueia mais o cliente automaticamente.
    -- Apenas notifica o barbeiro via checkAndNotifyNoShowLimit (frontend).
    -- O barbeiro decide se quer conversar com o cliente no WhatsApp.
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Remove a funcao de verificacao de bloqueio (nao usada em mais nada)
CREATE OR REPLACE FUNCTION is_client_blocked_by_no_show(p_client_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Sempre retorna false — nao bloqueamos mais clientes por falta
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Corrige 3 bugs críticos:
-- 1. save_loyalty_milestones - não existia, quebrava o salvamento de metas
-- 2. increment_client_visits (plural) - frontend chamava plural mas só existia singular
-- 3. log_reminder_sent - não existia, quebrava o log de lembretes

-- 1. RPC: save_loyalty_milestones
-- Substitui atomicamente todas as milestones ativas pelas novas.
-- Recebe array de { visits_required, reward_service_id } e faz replace completo.
CREATE OR REPLACE FUNCTION save_loyalty_milestones(
    p_milestones JSONB
)
RETURNS void AS $$
DECLARE
    v_milestone JSONB;
    v_visits INTEGER;
    v_service_id UUID;
    v_existing_id UUID;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem gerenciar metas de fidelidade';
    END IF;

    -- Desativa todas as milestones existentes
    UPDATE loyalty_milestones SET is_active = false WHERE is_active = true;

    -- Itera sobre as novas milestones
    FOR v_milestone IN SELECT * FROM jsonb_array_elements(p_milestones)
    LOOP
        v_visits := (v_milestone->>'visits_required')::INTEGER;
        v_service_id := (v_milestone->>'reward_service_id')::UUID;

        -- Verifica se já existe uma milestone com essas visitas
        SELECT id INTO v_existing_id FROM loyalty_milestones
        WHERE visits_required = v_visits AND reward_service_id = v_service_id
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            -- Reativa a existente
            UPDATE loyalty_milestones SET is_active = true WHERE id = v_existing_id;
        ELSE
            -- Cria nova
            INSERT INTO loyalty_milestones (visits_required, reward_service_id, is_active)
            VALUES (v_visits, v_service_id, true);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: log_reminder_sent
-- Registra o envio de um lembrete na tabela reminder_logs.
CREATE OR REPLACE FUNCTION log_reminder_sent(
    p_client_id UUID,
    p_template_name TEXT DEFAULT NULL,
    p_message_preview TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Tenta obter o usuário autenticado
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    INSERT INTO reminder_logs (client_id, template_name, message_preview, user_id)
    VALUES (p_client_id, p_template_name, p_message_preview, v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: increment_client_visits (alias - plural)
-- O frontend chama 'increment_client_visits' (plural).
-- O backend já tem 'increment_client_visit' (singular).
-- Este alias garante compatibilidade sem precisar alterar o frontend.
CREATE OR REPLACE FUNCTION increment_client_visits(p_client_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_visits INTEGER;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    UPDATE clients SET historical_visits = COALESCE(historical_visits, 0) + 1
    WHERE id = p_client_id
    RETURNING COALESCE(historical_visits, 0) INTO v_visits;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente nao encontrado.';
    END IF;

    RETURN v_visits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Converte notificações no formato pipe-separado (legado) para o formato
-- JSON padronizado. Também padroniza os títulos "Novo Agendamento! 💈"
-- para "Novo Agendamento!" e "Agendamento Cancelado ❌" para 
-- "Agendamento Cancelado".

-- Função auxiliar: converte body pipe-separado para JSON
CREATE OR REPLACE FUNCTION _convert_notification_body_to_json()
RETURNS void AS $$
DECLARE
    v_notif RECORD;
    v_parts text[];
    v_client_name text;
    v_services text;
    v_date_time text;
    v_total_price text;
    v_client_phone text;
    v_manage_url text;
    v_json_body text;
    v_count integer := 0;
BEGIN
    -- Busca notificações com body no formato pipe-separado (não JSON)
    FOR v_notif IN 
        SELECT id, title, body, tag 
        FROM notifications 
        WHERE body NOT LIKE '{%'  -- não começa com { (não é JSON)
          AND body NOT LIKE 'Se você vê%'  -- não é teste
    LOOP
        BEGIN
            -- Tenta fazer o parse do body antigo
            -- Formato antigo: "Nome | Serviços | Data às Hora | R$ XX,XX | Telefone | URL"
            v_parts := string_to_array(v_notif.body, ' | ');
            
            IF array_length(v_parts, 1) >= 6 THEN
                v_client_name := trim(v_parts[1]);
                v_services := trim(v_parts[2]);
                v_date_time := trim(v_parts[3]);
                v_total_price := trim(v_parts[4]);
                v_client_phone := trim(v_parts[5]);
                v_manage_url := trim(v_parts[6]);
                
                -- Se for cancelamento, a URL é "Cancelado"
                -- Se for agendamento novo, a URL é um link
                
                -- Constrói o JSON
                v_json_body := jsonb_build_object(
                    'clientName', v_client_name,
                    'services', v_services,
                    'dateTime', v_date_time,
                    'totalPrice', v_total_price,
                    'clientPhone', v_client_phone,
                    'manageUrl', v_manage_url,
                    'isMensalista', false
                )::text;
                
                -- Padroniza o título (remove emojis antigos)
                UPDATE notifications 
                SET body = v_json_body,
                    title = CASE 
                        WHEN title LIKE 'Novo Agendamento%' THEN 'Novo Agendamento!'
                        WHEN title LIKE 'Agendamento Cancelado%' THEN 'Agendamento Cancelado'
                        ELSE title
                    END
                WHERE id = v_notif.id;
                
                v_count := v_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Se falhar, pula essa notificação
            NULL;
        END;
    END LOOP;
    
    RAISE NOTICE 'Convertidas % notificações para formato JSON.', v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executa a conversão
SELECT _convert_notification_body_to_json();

-- Remove a função auxiliar (não precisa mais)
DROP FUNCTION IF EXISTS _convert_notification_body_to_json();

-- >>> MIGRATION: 004_subscriptions_pix.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 004 - ASSINATURAS PIX + BLOQUEIO
-- =========================================================================
-- Consolidado de: 006_subscriptions_pix.sql, 007_fix_agendamento.sql
-- Subscriptions, payment_logs, payment_blocked_users, check_login_allowed, PIX e fix do agendamento.
-- =========================================================================


-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 006_subscriptions_pix.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 006 - ASSINATURAS + PIX + BLOQUEIO
-- =========================================================================
-- Consolidado de: 006_subscriptions.sql, 007_monthly_subscriptions.sql,
--                 008_pix_setup.sql, 011_payment_blocked_users.sql
-- =========================================================================

----------------------------------------------------------------------
-- PARTE 1: TABELAS DE ASSINATURA
----------------------------------------------------------------------

-- 1.1 TABELA subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('active', 'pending', 'expired', 'cancelled')),
    current_period_start DATE,
    current_period_end DATE,
    grace_period_end DATE,
    asaas_customer_id TEXT,
    asaas_payment_id TEXT,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 TABELA payment_logs
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    asaas_payment_id TEXT,
    amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'overdue', 'refunded', 'cancelled')),
    payment_method TEXT,
    pix_qr_code TEXT,
    pix_payload TEXT,
    payment_link TEXT,
    paid_at TIMESTAMPTZ,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 INDEXES
CREATE INDEX IF NOT EXISTS idx_subscriptions_barber_id ON subscriptions(barber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_per_barber
    ON subscriptions(barber_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(current_period_end)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_payment_logs_subscription ON payment_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_barber ON payment_logs(barber_id);

-- 1.4 RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscriptions: admins full" ON subscriptions;
CREATE POLICY "Subscriptions: admins full" ON subscriptions
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Subscriptions: barber view own" ON subscriptions;
CREATE POLICY "Subscriptions: barber view own" ON subscriptions
    FOR SELECT TO authenticated
    USING (
        barber_id IN (
            SELECT id FROM barbers WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Payment logs: admins full" ON payment_logs;
CREATE POLICY "Payment logs: admins full" ON payment_logs
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Payment logs: barber view own" ON payment_logs;
CREATE POLICY "Payment logs: barber view own" ON payment_logs
    FOR SELECT TO authenticated
    USING (
        barber_id IN (
            SELECT id FROM barbers WHERE user_id = auth.uid()
        )
    );

----------------------------------------------------------------------
-- PARTE 2: FUNÇÕES DE ASSINATURA (VERSÃO FINAL - MENSAL CALENDÁRIO)
----------------------------------------------------------------------

-- 2.1 update_subscription_paid (versão mensal calendário)
CREATE OR REPLACE FUNCTION update_subscription_paid(
    p_barber_id UUID,
    p_asaas_payment_id TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_sub_id UUID;
    v_last_day_current DATE;
    v_new_end DATE;
    v_result jsonb;
BEGIN
    SELECT id INTO v_sub_id FROM subscriptions
    WHERE barber_id = p_barber_id AND status = 'pending'
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO subscriptions (barber_id, status)
        VALUES (p_barber_id, 'pending')
        RETURNING id INTO v_sub_id;
    END IF;

    v_last_day_current := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

    -- REGRA: se pagou no último dia do mês → leva o mês INTEIRO seguinte
    IF CURRENT_DATE >= v_last_day_current THEN
        v_new_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months - 1 day')::DATE;
    ELSE
        v_new_end := v_last_day_current;
    END IF;

    UPDATE subscriptions SET
        status = 'active',
        current_period_start = CURRENT_DATE,
        current_period_end = v_new_end,
        grace_period_end = v_new_end,
        asaas_payment_id = COALESCE(p_asaas_payment_id, asaas_payment_id),
        updated_at = NOW()
    WHERE id = v_sub_id;

    INSERT INTO payment_logs (subscription_id, barber_id, asaas_payment_id, amount, status, payment_method, paid_at, due_date)
    VALUES (v_sub_id, p_barber_id, p_asaas_payment_id, 50.00, 'confirmed', p_payment_method, NOW(), v_new_end);

    RETURN jsonb_build_object('success', true, 'subscription_id', v_sub_id, 'new_expiry', v_new_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 check_subscription_status (versão final)
CREATE OR REPLACE FUNCTION check_subscription_status(p_barber_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_sub RECORD;
    v_is_active BOOLEAN;
    v_status TEXT;
    v_days_remaining INTEGER;
    v_is_blocked BOOLEAN;
BEGIN
    SELECT * INTO v_sub FROM subscriptions
    WHERE barber_id = p_barber_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'has_subscription', false,
            'is_active', true,
            'status', 'none',
            'days_remaining', 999,
            'is_blocked', false,
            'current_period_end', NULL::TEXT
        );
    END IF;

    v_is_active := v_sub.status = 'active'
                   AND v_sub.current_period_end IS NOT NULL
                   AND v_sub.current_period_end >= CURRENT_DATE;

    IF v_sub.status = 'active' AND (v_sub.current_period_end IS NULL OR v_sub.current_period_end < CURRENT_DATE) THEN
        v_status := 'expired';
    ELSE
        v_status := v_sub.status;
    END IF;

    v_days_remaining := CASE
        WHEN v_sub.current_period_end IS NULL THEN 0
        ELSE GREATEST(0, v_sub.current_period_end - CURRENT_DATE)
    END;

    v_is_blocked := NOT (v_sub.status = 'active' AND v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end >= CURRENT_DATE);

    RETURN jsonb_build_object(
        'has_subscription', true,
        'is_active', v_is_active,
        'status', v_status,
        'current_period_start', v_sub.current_period_start,
        'current_period_end', v_sub.current_period_end,
        'grace_period_end', v_sub.grace_period_end,
        'days_remaining', v_days_remaining,
        'is_blocked', v_is_blocked
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2.3 get_payment_history
CREATE OR REPLACE FUNCTION get_payment_history(p_barber_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', pl.id,
            'amount', pl.amount,
            'status', pl.status,
            'payment_method', pl.payment_method,
            'paid_at', pl.paid_at,
            'due_date', pl.due_date,
            'created_at', pl.created_at
        ) ORDER BY pl.created_at DESC
    ) INTO v_result
    FROM payment_logs pl
    WHERE pl.barber_id = p_barber_id;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2.4 auto_create_subscription (versão final - trial até fim do mês)
CREATE OR REPLACE FUNCTION auto_create_subscription()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT NEW.is_owner AND NOT EXISTS (
        SELECT 1 FROM subscriptions WHERE barber_id = NEW.id
    ) THEN
        INSERT INTO subscriptions (barber_id, status, grace_period_end)
        VALUES (
            NEW.id,
            'pending',
            (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_subscription ON barbers;
CREATE TRIGGER trg_auto_create_subscription
AFTER INSERT ON barbers
FOR EACH ROW
EXECUTE FUNCTION auto_create_subscription();

----------------------------------------------------------------------
-- PARTE 3: PIX SETUP + MIGRAÇÃO
----------------------------------------------------------------------

-- 3.1 Chave PIX e email do proprietário
INSERT INTO settings (key, value)
VALUES ('owner_pix_key', '70263397610')
ON CONFLICT (key) DO UPDATE SET value = '70263397610';

INSERT INTO settings (key, value)
VALUES ('owner_email', 'elberthmayan2007@gmail.com')
ON CONFLICT (key) DO NOTHING;

-- 3.2 Cria subscriptions ativas para barbeiros existentes não-owners
INSERT INTO subscriptions (barber_id, status, current_period_start, current_period_end)
SELECT
  b.id,
  'active',
  CURRENT_DATE,
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
FROM barbers b
WHERE b.is_owner = FALSE
AND NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.barber_id = b.id
);

----------------------------------------------------------------------
-- PARTE 4: BLOQUEIO POR PAGAMENTO (SERVER-SIDE)
----------------------------------------------------------------------

-- 4.1 Tabela de usuários bloqueados
CREATE TABLE IF NOT EXISTS payment_blocked_users (
    email TEXT PRIMARY KEY,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT DEFAULT 'payment_missing',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_blocked_users_email ON payment_blocked_users(email);
ALTER TABLE payment_blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage payment_blocked_users" ON payment_blocked_users;
CREATE POLICY "Admin manage payment_blocked_users"
    ON payment_blocked_users FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- 4.2 Função de verificação de login
-- Lê o email do proprietário da tabela settings (não hardcoded)
CREATE OR REPLACE FUNCTION check_login_allowed(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_blocked RECORD;
    v_owner_email TEXT;
BEGIN
    -- Busca email do proprietário da settings (configurável sem editar SQL)
    SELECT COALESCE(value, 'elberthmayan2007@gmail.com') INTO v_owner_email
    FROM settings WHERE key = 'owner_email';

    -- Owner sempre pode logar
    IF LOWER(TRIM(p_email)) = LOWER(TRIM(v_owner_email)) THEN
        RETURN jsonb_build_object('allowed', true, 'reason', null);
    END IF;

    -- Verifica se o email está na lista de bloqueados
    SELECT * INTO v_blocked
    FROM payment_blocked_users
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', '❌ Conta bloqueada por falta de pagamento. ' ||
                      'Entre em contato com o administrador para regularizar a mensalidade de R$ 50,00. ' ||
                      'Após a confirmação, você poderá acessar normalmente.'
        );
    END IF;

    RETURN jsonb_build_object('allowed', true, 'reason', null);
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 007_fix_agendamento.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 007 - FIX: AGENDAMENTO + WRAPPER
-- =========================================================================
-- Consolidado de: 009_fix_criar_agendamento.sql, 010_wrapper_criar_agendamento.sql
-- =========================================================================

-- Dropar versões antigas (se existirem)
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text);
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric);

-- Função principal com rate limiting e no-show check
-- Frontend chama com named params (Supabase RPC), entao p_discount_amount
-- e recebido mas NAO usado para calcular desconto (calculo 100% server-side
-- dentro de criar_agendamento). Mantido apenas para compatibilidade.
CREATE OR REPLACE FUNCTION criar_agendamento_rate_limited(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time,
    p_preco_total decimal,
    p_duracao_total integer,
    p_cliente_email text DEFAULT NULL,
    p_coupon_id uuid DEFAULT NULL,
    p_discount_amount decimal DEFAULT 0,
    p_barber_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
BEGIN
    IF NOT check_rate_limit('criar_agendamento', 3, 60) THEN
        RAISE EXCEPTION 'Muitas tentativas. Aguarde 1 minuto e tente novamente.';
    END IF;

    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;
    IF v_client_id IS NOT NULL THEN
        PERFORM check_client_no_show_block(v_client_id);
    END IF;

    RETURN criar_agendamento(
        p_cliente_nome, p_cliente_telefone, p_servicos,
        p_data, p_hora, p_preco_total, p_duracao_total, p_cliente_email,
        p_coupon_id, p_barber_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissão para a versão com parâmetros nomeados (frontend)
GRANT EXECUTE ON FUNCTION criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric, uuid) TO anon, authenticated;

-- Wrapper removido: a versão acima com named params já cobre todos os casos.
-- A wrapper duplicada com ordem invertida de parâmetros (barber_id primeiro)
-- causava ambiguidade na resolução de named parameters pelo Supabase RPC.
DROP FUNCTION IF EXISTS public.criar_agendamento_rate_limited(uuid, text, text, text, uuid, date, numeric, integer, time, numeric, uuid[]);
