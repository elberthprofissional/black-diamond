-- =========================================================================
-- Fix: Horário de Almoço (Lunch Break)
-- =========================================================================
-- Corrige 3 problemas:
--   1. get_available_slots agora filtra slots de almoço
--   2. criar_agendamento agora valida contra horário de almoço
--   3. auto_block_lunch_break agora processa hoje E amanhã
-- =========================================================================

-- 1. get_available_slots: filtrar slots de almoço
CREATE OR REPLACE FUNCTION get_available_slots(p_date date)
RETURNS TABLE(slot_time text) AS $$
DECLARE
    v_opening time;
    v_closing time;
    v_day_of_week integer;
    v_hours_json jsonb;
    v_day_key text;
    v_day_enabled boolean := false;
    v_lunch_start time;
    v_lunch_end time;
    v_lunch_enabled boolean := false;
    v_lunch_days int[];
BEGIN
    IF p_date < CURRENT_DATE THEN
        RETURN;
    END IF;

    v_day_of_week := EXTRACT(DOW FROM p_date);
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

    -- Lê configuração do horário de almoço
    IF v_hours_json IS NOT NULL AND v_hours_json ? 'lunch_break' THEN
        v_lunch_enabled := COALESCE((v_hours_json->'lunch_break'->>'enabled')::boolean, false);
        IF v_lunch_enabled THEN
            v_lunch_start := (v_hours_json->'lunch_break'->>'start')::time;
            v_lunch_end := (v_hours_json->'lunch_break'->>'end')::time;
            v_lunch_days := ARRAY(SELECT jsonb_array_elements_text(v_hours_json->'lunch_break'->'days')::int);
        END IF;
    END IF;

    IF NOT v_day_enabled THEN
        RETURN;
    END IF;

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
    )
    AND (
        NOT v_lunch_enabled
        OR NOT (v_day_of_week = ANY(v_lunch_days))
        OR slot::time < v_lunch_start
        OR slot::time >= v_lunch_end
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. criar_agendamento: validar contra horário de almoço
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
    v_token text;
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
    v_lunch_start time;
    v_lunch_end time;
    v_lunch_enabled boolean := false;
    v_lunch_days int[];
BEGIN
    -- VALIDAÇÃO DE INPUT
    p_cliente_nome := TRIM(p_cliente_nome);
    IF p_cliente_nome = '' OR length(p_cliente_nome) < 2 THEN
        RAISE EXCEPTION 'Nome do cliente inválido (mínimo de 2 caracteres).';
    END IF;

    p_cliente_telefone := TRIM(p_cliente_telefone);
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

    IF p_servicos IS NULL OR array_length(p_servicos, 1) IS NULL OR array_length(p_servicos, 1) = 0 THEN
        RAISE EXCEPTION 'Selecione pelo menos um serviço.';
    END IF;

    IF p_data < CURRENT_DATE THEN
        RAISE EXCEPTION 'Não é possível agendar em uma data passada.';
    END IF;

    -- VALIDAÇÃO DE HORÁRIO DE FUNCIONAMENTO
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

    -- VALIDAÇÃO DE HORÁRIO DE ALMOÇO
    IF v_hours_json IS NOT NULL AND v_hours_json ? 'lunch_break' THEN
        v_lunch_enabled := COALESCE((v_hours_json->'lunch_break'->>'enabled')::boolean, false);
        IF v_lunch_enabled THEN
            v_lunch_start := (v_hours_json->'lunch_break'->>'start')::time;
            v_lunch_end := (v_hours_json->'lunch_break'->>'end')::time;
            v_lunch_days := ARRAY(SELECT jsonb_array_elements_text(v_hours_json->'lunch_break'->'days')::int);
            IF v_day_of_week = ANY(v_lunch_days) AND p_hora >= v_lunch_start AND p_hora < v_lunch_end THEN
                RAISE EXCEPTION 'Este horário está dentro do horário de almoço. Escolha outro horário.';
            END IF;
        END IF;
    END IF;

    -- LIMITE DE AGENDAMENTOS POR DIA
    SELECT COUNT(*) INTO v_daily_bookings
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_cliente_telefone
    AND b.booking_date = p_data
    AND b.status != 'cancelled';

    IF v_daily_bookings >= 3 THEN
        RAISE EXCEPTION 'Limite de 3 agendamentos por dia atingido.';
    END IF;

    -- CÁLCULO DO LADO DO SERVIDOR (impede manipulação pelo cliente)
    SELECT COALESCE(SUM(price), 0), COALESCE(SUM(duration), 0)
    INTO v_server_price, v_server_duration
    FROM services WHERE id = ANY(p_servicos);

    IF v_server_price = 0 AND array_length(p_servicos, 1) > 0 THEN
        RAISE EXCEPTION 'Serviço(s) inválido(s).';
    END IF;

    p_preco_total := v_server_price;
    p_duracao_total := v_server_duration;

    -- BUSCA OU CRIA CLIENTE
    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;

    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, phone, email)
        VALUES (p_cliente_nome, p_cliente_telefone, p_cliente_email)
        RETURNING id INTO v_client_id;
    ELSIF p_cliente_email IS NOT NULL AND p_cliente_email != '' THEN
        UPDATE clients SET email = p_cliente_email WHERE id = v_client_id AND (email IS NULL OR email = '');
    END IF;

    -- CRIA O AGENDAMENTO
    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status)
    VALUES (v_client_id, p_servicos, p_data, p_hora, p_preco_total, p_duracao_total, 'confirmed')
    RETURNING id INTO v_booking_id;

    -- GERA TOKEN ÚNICO PARA GERENCIAMENTO
    v_token := encode(gen_random_bytes(16), 'hex');
    INSERT INTO booking_tokens (booking_id, token, expires_at)
    VALUES (v_booking_id, v_token, NOW() + INTERVAL '90 days');

    SELECT jsonb_build_object(
        'id', b.id,
        'client_id', b.client_id,
        'status', b.status,
        'token', v_token
    ) INTO v_result
    FROM bookings b WHERE b.id = v_booking_id;

    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Horário preenchido. Escolha outro.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. auto_block_lunch_break: processar hoje E amanhã
CREATE OR REPLACE FUNCTION auto_block_lunch_break()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config JSONB;
    v_lunch JSONB;
    v_enabled BOOLEAN;
    v_start TIME;
    v_end TIME;
    v_days INT[];
    v_target_dates DATE[];
    v_target_date DATE;
    v_target_dow INT;
    v_slot TIME;
    v_blocked_count INT;
    v_total_blocked INT := 0;
BEGIN
    SELECT value::JSONB INTO v_config
    FROM settings
    WHERE key = 'barber_hours'
    LIMIT 1;

    IF v_config IS NULL THEN RETURN; END IF;

    v_lunch := v_config->'lunch_break';
    IF v_lunch IS NULL THEN RETURN; END IF;

    v_enabled := (v_lunch->>'enabled')::BOOLEAN;
    IF NOT v_enabled THEN RETURN; END IF;

    v_start := (v_lunch->>'start')::TIME;
    v_end := (v_lunch->>'end')::TIME;
    IF v_start IS NULL OR v_end IS NULL OR v_start >= v_end THEN RETURN; END IF;

    v_days := ARRAY(SELECT jsonb_array_elements_text(v_lunch->'days')::INT);

    -- Processa hoje E amanhã
    v_target_dates := ARRAY[
        (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE,
        (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE + 1
    ];

    FOREACH v_target_date IN ARRAY v_target_dates LOOP
        v_target_dow := EXTRACT(DOW FROM v_target_date)::INT;

        IF array_length(v_days, 1) > 0 AND NOT (v_target_dow = ANY(v_days)) THEN
            CONTINUE;
        END IF;

        v_slot := v_start;
        v_blocked_count := 0;

        WHILE v_slot < v_end LOOP
            IF NOT EXISTS (
                SELECT 1 FROM bookings
                WHERE booking_date = v_target_date
                  AND booking_time = v_slot
                  AND status IN ('confirmed', 'pending')
                  AND is_blocked = FALSE
            ) THEN
                IF NOT EXISTS (
                    SELECT 1 FROM bookings
                    WHERE booking_date = v_target_date
                      AND booking_time = v_slot
                      AND is_blocked = TRUE
                ) THEN
                    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, is_blocked)
                    VALUES (NULL, ARRAY[]::UUID[], v_target_date, v_slot, 0, 0, 'confirmed', TRUE);
                    v_blocked_count := v_blocked_count + 1;
                END IF;
            END IF;
            v_slot := v_slot + INTERVAL '1 hour';
        END LOOP;

        IF v_blocked_count > 0 THEN
            v_total_blocked := v_total_blocked + v_blocked_count;
            RAISE NOTICE 'Lunch break: blocked % slots for %', v_blocked_count, v_target_date;
        END IF;
    END LOOP;

    IF v_total_blocked = 0 THEN
        RAISE NOTICE 'Lunch break: no slots needed blocking';
    END IF;
END;
$$;
