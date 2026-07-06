-- =========================================================================
-- MIGRATION: AUDIT REPORT FIXES (HIGH & MEDIUM SEVERITY)
-- =========================================================================

-- 1. VAL-1 & VAL-2: Validação de input na RPC criar_agendamento
CREATE OR REPLACE FUNCTION criar_agendamento(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time,
    p_preco_total decimal,
    p_duracao_total integer,
    p_cliente_email text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
    v_booking_id uuid;
    v_result jsonb;
    v_daily_bookings integer;
    v_day_of_week integer;
    v_hours_json jsonb;
    v_day_key text;
    v_day_enabled boolean := false;
    v_opening time;
    v_closing time;
    v_server_price decimal;
    v_server_duration integer;
BEGIN
    -- VAL-1: Validação de input
    p_cliente_nome := TRIM(p_cliente_nome);
    IF p_cliente_nome = '' OR length(p_cliente_nome) < 2 THEN
        RAISE EXCEPTION 'Nome do cliente inválido (mínimo de 2 caracteres).';
    END IF;

    p_cliente_telefone := TRIM(p_cliente_telefone);
    -- Garante formato apenas de dígitos de 10 a 15 de tamanho
    IF p_cliente_telefone !~ '^[0-9]{10,15}$' THEN
        RAISE EXCEPTION 'Número de telefone inválido (deve conter apenas números e ter entre 10 e 15 dígitos).';
    END IF;

    IF p_cliente_email IS NOT NULL AND TRIM(p_cliente_email) != '' THEN
        p_cliente_email := TRIM(p_cliente_email);
        IF p_cliente_email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$' THEN
            RAISE EXCEPTION 'E-mail inválido.';
        END IF;
    ELSE
        p_cliente_email := NULL;
    END IF;

    -- VAL-2: Validação de serviço vazio
    IF p_servicos IS NULL OR array_length(p_servicos, 1) IS NULL OR array_length(p_servicos, 1) = 0 THEN
        RAISE EXCEPTION 'Selecione pelo menos um serviço.';
    END IF;

    IF p_data < CURRENT_DATE THEN
        RAISE EXCEPTION 'Não é possível agendar em uma data passada.';
    END IF;

    -- Validate booking time is within business hours
    v_day_of_week := EXTRACT(DOW FROM p_data);
    v_day_key := v_day_of_week::text;

    v_hours_json := (SELECT value::jsonb FROM settings WHERE key = 'barber_hours');

    IF v_hours_json IS NOT NULL AND v_hours_json ? v_day_key THEN
        v_day_enabled := (v_hours_json->v_day_key->>'enabled')::boolean;
        IF v_day_enabled THEN
            v_opening := (v_hours_json->v_day_key->>'open')::time;
            v_closing := (v_hours_json->v_day_key->>'close')::time;
        END IF;
    ELSE
        v_day_enabled := EXISTS (
            SELECT 1 FROM unnest(string_to_array(
                COALESCE((SELECT value FROM settings WHERE key = 'working_days'), '1,2,3,4,5,6'), ','
            )) AS d WHERE d = v_day_key
        );
        IF v_day_enabled THEN
            IF v_day_of_week = 6 THEN
                v_opening := COALESCE((SELECT value::time FROM settings WHERE key = 'saturday_opening'), '08:00'::time);
                v_closing := COALESCE((SELECT value::time FROM settings WHERE key = 'saturday_closing'), '18:00'::time);
            ELSE
                v_opening := COALESCE((SELECT value::time FROM settings WHERE key = 'opening_time'), '08:00'::time);
                v_closing := COALESCE((SELECT value::time FROM settings WHERE key = 'closing_time'), '18:00'::time);
            END IF;
        END IF;
    END IF;

    IF NOT v_day_enabled THEN
        RAISE EXCEPTION 'Este dia não está disponível para agendamento.';
    END IF;

    IF p_hora < v_opening OR p_hora >= v_closing THEN
        RAISE EXCEPTION 'O horário escolhido está fora do horário de funcionamento (%-%).', v_opening, v_closing;
    END IF;

    SELECT COUNT(*) INTO v_daily_bookings
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_cliente_telefone
    AND b.booking_date = p_data
    AND b.status != 'cancelled';

    IF v_daily_bookings >= 3 THEN
        RAISE EXCEPTION 'Limite de 3 agendamentos por dia atingido.';
    END IF;

    -- Server-side price and duration calculation (prevent client-side manipulation)
    SELECT COALESCE(SUM(price), 0), COALESCE(SUM(duration), 0)
    INTO v_server_price, v_server_duration
    FROM services WHERE id = ANY(p_servicos);

    IF v_server_price = 0 AND array_length(p_servicos, 1) > 0 THEN
        RAISE EXCEPTION 'Serviço(s) inválido(s).';
    END IF;

    -- Use server-calculated values instead of client-supplied
    p_preco_total := v_server_price;
    p_duracao_total := v_server_duration;

    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;

    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, phone, email)
        VALUES (p_cliente_nome, p_cliente_telefone, p_cliente_email)
        RETURNING id INTO v_client_id;
    ELSIF p_cliente_email IS NOT NULL AND p_cliente_email != '' THEN
        UPDATE clients SET email = p_cliente_email WHERE id = v_client_id AND (email IS NULL OR email = '');
    END IF;

    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status)
    VALUES (v_client_id, p_servicos, p_data, p_hora, p_preco_total, p_duracao_total, 'confirmed')
    RETURNING id INTO v_booking_id;

    SELECT jsonb_build_object('id', b.id, 'client_id', b.client_id, 'status', b.status) INTO v_result
    FROM bookings b WHERE b.id = v_booking_id;

    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Horário preenchido. Escolha outro.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. CORRECT-2: Lógica de bloqueio com client_id NULL + constraint
-- Migração de dados de bloqueio existentes caso usem o telefone fictício '00000000000'
DO $$
DECLARE
    v_bloqueado_id uuid;
BEGIN
    SELECT id INTO v_bloqueado_id FROM clients WHERE phone = '00000000000' LIMIT 1;
    IF v_bloqueado_id IS NOT NULL THEN
        UPDATE bookings SET client_id = NULL WHERE client_id = v_bloqueado_id;
        DELETE FROM clients WHERE id = v_bloqueado_id;
    END IF;
END $$;

-- Adiciona constraint de regras de agendamento/bloqueio
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_booking_block_rules;
ALTER TABLE bookings ADD CONSTRAINT chk_booking_block_rules
CHECK (
    (is_blocked = true AND client_id IS NULL AND total_price = 0 AND total_duration = 0) OR
    (is_blocked = false AND client_id IS NOT NULL)
);

-- Atualiza toggle_slot_block
CREATE OR REPLACE FUNCTION toggle_slot_block(p_date date, p_time time)
RETURNS jsonb AS $$
DECLARE
    v_existing_id uuid;
    v_result jsonb;
BEGIN
    SELECT b.id INTO v_existing_id
    FROM bookings b
    WHERE b.booking_date = p_date AND b.booking_time = p_time AND b.status != 'cancelled'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        UPDATE bookings SET is_blocked = NOT is_blocked WHERE id = v_existing_id RETURNING id INTO v_existing_id;
        SELECT jsonb_build_object('id', v_existing_id, 'blocked', (SELECT is_blocked FROM bookings WHERE id = v_existing_id)) INTO v_result;
        RETURN v_result;
    ELSE
        -- Opção profissional: Insere com client_id NULL para bloqueio
        INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, is_blocked)
        VALUES (NULL, '{}', p_date, p_time, 0, 0, 'confirmed', true)
        RETURNING id INTO v_existing_id;

        RETURN jsonb_build_object('id', v_existing_id, 'blocked', true);
    END IF;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Horário em conflito. Tente novamente.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. VAL-3 & PERF-1: get_available_slots otimizada e past-date guard
CREATE OR REPLACE FUNCTION get_available_slots(p_date date)
RETURNS TABLE(slot_time text) AS $$
DECLARE
    v_opening time;
    v_closing time;
    v_day_of_week integer;
    v_hours_json jsonb;
    v_day_key text;
    v_day_enabled boolean := false;
BEGIN
    -- VAL-3: Past-date guard
    IF p_date < CURRENT_DATE THEN
        RETURN;
    END IF;

    v_day_of_week := EXTRACT(DOW FROM p_date);
    v_day_key := v_day_of_week::text;

    -- Read from barber_hours JSON (set by admin panel)
    v_hours_json := (SELECT value::jsonb FROM settings WHERE key = 'barber_hours');

    IF v_hours_json IS NOT NULL AND v_hours_json ? v_day_key THEN
        v_day_enabled := (v_hours_json->v_day_key->>'enabled')::boolean;
        IF v_day_enabled THEN
            v_opening := (v_hours_json->v_day_key->>'open')::time;
            v_closing := (v_hours_json->v_day_key->>'close')::time;
        END IF;
    ELSE
        -- Fallback to individual settings
        v_day_enabled := EXISTS (
            SELECT 1 FROM unnest(string_to_array(
                COALESCE((SELECT value FROM settings WHERE key = 'working_days'), '1,2,3,4,5,6'), ','
            )) AS d WHERE d = v_day_key
        );
        IF v_day_enabled THEN
            IF v_day_of_week = 6 THEN
                v_opening := COALESCE((SELECT value::time FROM settings WHERE key = 'saturday_opening'), '08:00'::time);
                v_closing := COALESCE((SELECT value::time FROM settings WHERE key = 'saturday_closing'), '18:00'::time);
            ELSE
                v_opening := COALESCE((SELECT value::time FROM settings WHERE key = 'opening_time'), '08:00'::time);
                v_closing := COALESCE((SELECT value::time FROM settings WHERE key = 'closing_time'), '18:00'::time);
            END IF;
        END IF;
    END IF;

    IF NOT v_day_enabled THEN
        RETURN;
    END IF;

    -- PERF-1: Optimized single query generate_series without WHILE loop
    RETURN QUERY
    SELECT to_char(slot, 'HH24:MI:SS') AS slot_time
    FROM generate_series(
        p_date + v_opening,
        p_date + v_closing - interval '1 second',
        interval '1 hour'
    ) AS slot
    WHERE NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.booking_date = p_date
        AND b.booking_time = slot::time
        AND b.status != 'cancelled'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. SEC-1 & SEC-2: Unnecessary SECURITY DEFINER on get_business_hours() & get_average_rating()
CREATE OR REPLACE FUNCTION get_business_hours()
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_object_agg(key, value) INTO v_result
    FROM settings
    WHERE key IN ('opening_time', 'closing_time', 'saturday_opening', 'saturday_closing', 'working_days', 'barber_hours', 'barber_name', 'barber_phone');
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION get_average_rating()
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'average', COALESCE(ROUND(AVG(rating), 1), 0),
        'count', COUNT(id)
    ) INTO v_result
    FROM reviews;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;


-- 5. RLS-1: Push subscription RPC security check
CREATE OR REPLACE FUNCTION save_push_subscription(
    p_endpoint text,
    p_p256dh text,
    p_auth text
)
RETURNS void AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar inscrições de push.';
    END IF;

    INSERT INTO push_subscriptions (endpoint, p256dh, auth)
    VALUES (p_endpoint, p_p256dh, p_auth)
    ON CONFLICT (endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_push_subscription(p_endpoint text)
RETURNS void AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar inscrições de push.';
    END IF;

    DELETE FROM push_subscriptions WHERE endpoint = p_endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. IDX-3, IDX-4: Missing Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_mensalista ON clients(id) WHERE is_mensalista;
CREATE INDEX IF NOT EXISTS idx_clients_blocked ON clients(id) WHERE is_blocked;
