-- =========================================================================
-- BLACK DIAMOND - MULTI-BARBER SUPPORT
-- =========================================================================
-- Adiciona suporte a multiplos barbeiros por barbearia.
-- Migration 008: tabela barbers, barber_id em bookings, indexes, RLS.
-- =========================================================================

-- =========================================================================
-- TABELA barbers
-- =========================================================================
CREATE TABLE IF NOT EXISTS barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

-- Index para buscar barbeiros por user_id
CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON barbers(user_id);
CREATE INDEX IF NOT EXISTS idx_barbers_active ON barbers(is_active) WHERE is_active = TRUE;

-- =========================================================================
-- ADICIONAR barber_id NA TABELA bookings
-- =========================================================================
-- Coluna nullable primeiro (para nao quebrar dados existentes)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL;

-- Index para filtrar bookings por barbeiro
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);

-- =========================================================================
-- ATUALIZAR INDEX UNICO DE DOUBLE-BOOKING
-- =========================================================================
-- O index antigo impedia 2 bookings no mesmo horario no SISTEMA TODO.
-- Agora permite 2 barbeiros diferentes no mesmo horario.
DROP INDEX IF EXISTS idx_no_double_booking;
CREATE UNIQUE INDEX idx_no_double_booking
    ON bookings(booking_date, booking_time, barber_id)
    WHERE status IN ('pending', 'confirmed') AND barber_id IS NOT NULL;

-- Index separado para bookings sem barber_id (legado)
CREATE UNIQUE INDEX idx_no_double_booking_legacy
    ON bookings(booking_date, booking_time)
    WHERE status IN ('pending', 'confirmed') AND barber_id IS NULL;

-- =========================================================================
-- TABELA barber_settings (horarios por barbeiro)
-- =========================================================================
CREATE TABLE IF NOT EXISTS barber_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(barber_id, key)
);

CREATE INDEX IF NOT EXISTS idx_barber_settings_barber_id ON barber_settings(barber_id);

-- =========================================================================
-- RLS PARA barbers
-- =========================================================================
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

-- Leitura publica (clientes precisam ver os barbeiros pra escolher)
DROP POLICY IF EXISTS "Barbeiros leitura publica" ON barbers;
CREATE POLICY "Barbeiros leitura publica" ON barbers
    FOR SELECT USING (is_active = TRUE);

-- Gerenciamento apenas admin
DROP POLICY IF EXISTS "Barbeiros gerenciamento admin" ON barbers;
CREATE POLICY "Barbeiros gerenciamento admin" ON barbers
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =========================================================================
-- RLS PARA barber_settings
-- =========================================================================
ALTER TABLE barber_settings ENABLE ROW LEVEL SECURITY;

-- Leitura publica (horarios necessarios pra calcular slots)
DROP POLICY IF EXISTS "Barber settings leitura publica" ON barber_settings;
CREATE POLICY "Barber settings leitura publica" ON barber_settings
    FOR SELECT USING (true);

-- Gerenciamento apenas admin
DROP POLICY IF EXISTS "Barber settings gerenciamento admin" ON barber_settings;
CREATE POLICY "Barber settings gerenciamento admin" ON barber_settings
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =========================================================================
-- RPC: get_barbers
-- Retorna todos os barbeiros ativos
-- =========================================================================
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

-- =========================================================================
-- RPC: get_barber_by_user_id
-- Retorna o barbeiro vinculado ao usuario logado
-- =========================================================================
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

-- =========================================================================
-- RPC: upsert_barber
-- Cria ou atualiza um barbeiro
-- =========================================================================
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
        -- Update existente
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
        -- Insert novo
        INSERT INTO barbers (user_id, name, phone, photo_url, bio, quote, is_active, is_owner, sort_order)
        VALUES (p_user_id, p_name, p_phone, p_photo_url, p_bio, p_quote, p_is_active, p_is_owner, p_sort_order)
        RETURNING id INTO v_barber_id;
    END IF;

    RETURN v_barber_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- RPC: delete_barber
-- Soft delete (desativa) ou hard delete de um barbeiro
-- =========================================================================
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

-- =========================================================================
-- MIGRAR DADOS DO BARBEIRO SOLO PARA TABELA barbers
-- =========================================================================
-- Cria um barbeiro "dono" com os dados atuais das settings globais
DO $$
DECLARE
    v_barber_name TEXT;
    v_barber_phone TEXT;
    v_barber_bio TEXT;
    v_barber_quote TEXT;
    v_barber_photo TEXT;
    v_owner_id UUID;
BEGIN
    -- Busca dados atuais das settings
    SELECT value INTO v_barber_name FROM settings WHERE key = 'barber_name';
    SELECT value INTO v_barber_phone FROM settings WHERE key = 'barber_phone';
    SELECT value INTO v_barber_bio FROM settings WHERE key = 'barber_bio';
    SELECT value INTO v_barber_quote FROM settings WHERE key = 'barber_quote';
    SELECT value INTO v_barber_photo FROM settings WHERE key = 'barber_photo';

    -- Busca o user_id do admin existente
    SELECT user_id INTO v_owner_id FROM admin_users LIMIT 1;

    -- So cria se nao existir nenhum barbeiro ainda
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

-- =========================================================================
-- TRIGGER: NOTIFICACAO AO CRIAR AGENDAMENTO (COM MULTI-BARBER)
-- =========================================================================
-- Atualiza o trigger existente pra enviar notificacao so pro barbeiro certo.
-- Se o booking tem barber_id, notifica aquele barbeiro + o dono.
-- Se nao tem barber_id (legado), notifica todos os admins.

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

    -- Se tem barber_id, notifica aquele barbeiro + dono
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

-- =========================================================================
-- TRIGGER: NOTIFICACAO AO CANCELAR AGENDAMENTO (COM MULTI-BARBER)
-- =========================================================================

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
