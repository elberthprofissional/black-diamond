-- =========================================================================
-- FIX: Adiciona p_coupon_id e p_discount_amount às funções de agendamento
-- O frontend envia esses parâmetros mas as funções SQL não os aceitavam
-- =========================================================================

-- 1. Atualizar criar_agendamento para aceitar cupom
CREATE OR REPLACE FUNCTION criar_agendamento(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time,
    p_preco_total decimal,
    p_duracao_total integer,
    p_cliente_email text DEFAULT NULL,
    p_coupon_id uuid DEFAULT NULL,
    p_discount_amount numeric DEFAULT 0
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
    v_lunch_start time;
    v_lunch_end time;
    v_lunch_enabled boolean := false;
    v_lunch_days int[];
    v_service_ends_at time;
    
    -- Variáveis para correção de mensalistas
    v_is_mensalista boolean := false;
    v_plan_id uuid;
    v_expires_at timestamptz;
    v_plan_services uuid[];
    v_service_id uuid;
    v_service_price decimal;
    v_server_duration integer;
    v_total_calculated_price decimal := 0;
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
    END IF;

    IF NOT v_day_enabled THEN
        RAISE EXCEPTION 'O estabelecimento não funciona neste dia da semana.';
    END IF;

    IF p_hora < v_opening OR p_hora >= v_closing THEN
        RAISE EXCEPTION 'Horário fora do horário de funcionamento.';
    END IF;

    -- Verifica lunch break
    v_lunch_enabled := (v_hours_json->v_day_key->>'lunch_enabled')::boolean;
    IF v_lunch_enabled THEN
        v_lunch_start := (v_hours_json->v_day_key->>'lunch_start')::time;
        v_lunch_end := (v_hours_json->v_day_key->>'lunch_end')::time;
        IF p_hora >= v_lunch_start AND p_hora < v_lunch_end THEN
            RAISE EXCEPTION 'Horário dentro do intervalo de almoço.';
        END IF;
    END IF;

    -- Verifica allowed_days (se configurado)
    IF EXISTS (SELECT 1 FROM settings WHERE key = 'allowed_days' AND value IS NOT NULL) THEN
        IF NOT ((SELECT value::jsonb->v_day_key FROM settings WHERE key = 'allowed_days')::boolean) THEN
            RAISE EXCEPTION 'Dia não disponível para agendamento.';
        END IF;
    END IF;

    -- Verifica limite de agendamentos por dia (3)
    SELECT COUNT(*) INTO v_daily_bookings
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_cliente_telefone
      AND b.booking_date = p_data
      AND b.status IN ('confirmed', 'pending');

    IF v_daily_bookings >= 3 THEN
        RAISE EXCEPTION 'Limite de 3 agendamentos por dia atingido para este telefone.';
    END IF;

    -- BUSCA OU CRIA O CLIENTE
    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;

    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, phone, email)
        VALUES (p_cliente_nome, p_cliente_telefone, p_cliente_email)
        RETURNING id INTO v_client_id;
    ELSE
        UPDATE clients SET name = p_cliente_nome, email = COALESCE(p_cliente_email, email)
        WHERE id = v_client_id;
    END IF;

    -- VERIFICA MENSALISTA
    SELECT is_mensalista, mensalista_plan_id, mensalista_expires_at
    INTO v_is_mensalista, v_plan_id, v_expires_at
    FROM clients WHERE id = v_client_id;

    IF v_is_mensalista AND v_plan_id IS NOT NULL AND (v_expires_at IS NULL OR v_expires_at > NOW()) THEN
        SELECT array_agg(service_id) INTO v_plan_services
        FROM plan_services WHERE plan_id = v_plan_id;
    END IF;

    -- CALCULA PREÇO E DURAÇÃO SERVIDOR
    v_total_calculated_price := 0;
    v_server_duration := 0;

    FOREACH v_service_id IN ARRAY p_servicos LOOP
        SELECT price, duration INTO v_service_price, v_server_duration
        FROM services WHERE id = v_service_id;

        IF v_service_price IS NULL THEN
            RAISE EXCEPTION 'Serviço não encontrado.';
        END IF;

        -- Se mensalista e serviço está no plano, preço = 0
        IF v_is_mensalista AND v_plan_services IS NOT NULL AND v_service_id = ANY(v_plan_services) THEN
            v_service_price := 0;
        END IF;

        v_total_calculated_price := v_total_calculated_price + v_service_price;
    END LOOP;

    -- Calcula duração total
    SELECT COALESCE(SUM(duration), 0) INTO v_server_duration
    FROM services WHERE id = ANY(p_servicos);

    -- Aplica desconto do cupom (se fornecido)
    IF p_coupon_id IS NOT NULL AND p_discount_amount > 0 THEN
        v_total_calculated_price := GREATEST(v_total_calculated_price - p_discount_amount, 0);
        -- Registra uso do cupom
        PERFORM apply_coupon(p_coupon_id);
    END IF;

    p_preco_total := v_total_calculated_price;
    p_duracao_total := v_server_duration;

    -- CRIA O AGENDAMENTO
    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, coupon_id, discount_amount)
    VALUES (v_client_id, p_servicos, p_data, p_hora, p_preco_total, p_duracao_total, 'confirmed', p_coupon_id, p_discount_amount)
    RETURNING id INTO v_booking_id;

    -- GERA TOKEN ÚNICO PARA GERENCIAMENTO
    v_token := encode(gen_random_bytes(16), 'hex');
    INSERT INTO booking_tokens (booking_id, token, expires_at)
    VALUES (v_booking_id, v_token, NOW() + INTERVAL '30 days');

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

-- 2. Atualizar criar_agendamento_rate_limited para repassar os parâmetros
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
    p_discount_amount numeric DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
BEGIN
    IF NOT check_rate_limit('criar_agendamento', 3, 60) THEN
        RAISE EXCEPTION 'Muitas tentativas. Aguarde 1 minuto e tente novamente.';
    END IF;

    -- Busca o cliente ANTES de criar para verificar bloqueio por faltas
    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
        PERFORM check_client_no_show_block(v_client_id);
    END IF;

    RETURN criar_agendamento(
        p_cliente_nome, p_cliente_telefone, p_servicos,
        p_data, p_hora, p_preco_total, p_duracao_total, p_cliente_email,
        p_coupon_id, p_discount_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
