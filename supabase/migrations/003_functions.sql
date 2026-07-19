-- =========================================================================
-- BLACK DIAMOND - FUNCOES RPC CONSOLIDADO
-- =========================================================================
-- Todas as funcoes RPC (Server Functions).
-- Estado final consolidado - versoes mais completas de cada funcao.
-- =========================================================================

-- =========================================================================
-- LIMPAR ASSINATURAS DUPLICADAS (de migrations anteriores)
-- CREATE OR REPLACE nao substitui assinaturas diferentes — precisa DROP
-- =========================================================================

-- Dropar TODAS as versoes de criar_agendamento_rate_limited
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time without time zone, numeric, integer, text);
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time without time zone, numeric, integer, text, uuid, numeric);

-- Dropar TODAS as versoes de criar_agendamento
DROP FUNCTION IF EXISTS criar_agendamento(text, text, uuid[], date, time without time zone, numeric, integer, text);
DROP FUNCTION IF EXISTS criar_agendamento(text, text, uuid[], date, time without time zone, numeric, integer, text, uuid);

-- =========================================================================
-- 1. AGENDAMENTOS
-- =========================================================================

-- Criar agendamento (com validacao de mensalista e cupom)
CREATE OR REPLACE FUNCTION criar_agendamento(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time,
    p_preco_total decimal,
    p_duracao_total integer,
    p_cliente_email text DEFAULT NULL,
    p_coupon_id uuid DEFAULT NULL
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
    v_server_duration integer;
    v_lunch_start time;
    v_lunch_end time;
    v_lunch_enabled boolean := false;
    v_lunch_days int[];
    v_service_ends_at time;
    v_is_mensalista boolean := false;
    v_plan_id uuid;
    v_expires_at timestamptz;
    v_plan_services uuid[];
    v_service_id uuid;
    v_service_price decimal;
    v_total_calculated_price decimal := 0;
    v_coupon_discount decimal := 0;
BEGIN
    -- VALIDACAO DE INPUT
    p_cliente_nome := TRIM(p_cliente_nome);
    IF p_cliente_nome = '' OR length(p_cliente_nome) < 2 THEN
        RAISE EXCEPTION 'Nome do cliente invalido (minimo de 2 caracteres).';
    END IF;

    p_cliente_telefone := TRIM(p_cliente_telefone);
    IF p_cliente_telefone !~ '^[0-9]{10,15}$' THEN
        RAISE EXCEPTION 'Numero de telefone invalido (deve conter apenas numeros e ter entre 10 e 15 digitos).';
    END IF;

    IF p_cliente_email IS NOT NULL AND TRIM(p_cliente_email) != '' THEN
        p_cliente_email := TRIM(p_cliente_email);
        IF p_cliente_email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$' THEN
            RAISE EXCEPTION 'E-mail invalido.';
        END IF;
    ELSE
        p_cliente_email := NULL;
    END IF;

    IF p_servicos IS NULL OR array_length(p_servicos, 1) IS NULL OR array_length(p_servicos, 1) = 0 THEN
        RAISE EXCEPTION 'Selecione pelo menos um servico.';
    END IF;

    IF p_data < CURRENT_DATE THEN
        RAISE EXCEPTION 'Nao e possivel agendar em uma data passada.';
    END IF;

    -- VALIDACAO DE HORARIO DE FUNCIONAMENTO
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
        RAISE EXCEPTION 'Este dia nao esta disponivel para agendamento.';
    END IF;

    IF p_hora < v_opening OR p_hora >= v_closing THEN
        RAISE EXCEPTION 'O horario escolhido esta fora do horario de funcionamento (%-%).', v_opening, v_closing;
    END IF;

    -- VALIDACAO DE HORARIO DE ALMOCO
    IF v_hours_json IS NOT NULL AND v_hours_json ? 'lunch_break' THEN
        v_lunch_enabled := COALESCE((v_hours_json->'lunch_break'->>'enabled')::boolean, false);
        IF v_lunch_enabled THEN
            v_lunch_start := (v_hours_json->'lunch_break'->>'start')::time;
            v_lunch_end := (v_hours_json->'lunch_break'->>'end')::time;
            v_lunch_days := ARRAY(SELECT jsonb_array_elements_text(v_hours_json->'lunch_break'->'days')::int);

            IF v_day_of_week = ANY(v_lunch_days) AND p_hora >= v_lunch_start AND p_hora < v_lunch_end THEN
                RAISE EXCEPTION 'Este horario esta dentro do horario de almoco. Escolha outro horario.';
            END IF;

            SELECT COALESCE(SUM(duration), 0) INTO v_server_duration
            FROM services WHERE id = ANY(p_servicos);

            v_service_ends_at := p_hora + (v_server_duration || ' minutes')::interval;

            IF v_day_of_week = ANY(v_lunch_days)
               AND p_hora < v_lunch_start
               AND v_service_ends_at > v_lunch_start THEN
                RAISE EXCEPTION 'Seu servico terminaria durante o horario de almoco (%). Escolha um horario mais cedo ou um servico mais curto.', v_lunch_start;
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

    -- BUSCA OU CRIA CLIENTE
    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;

    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, phone, email)
        VALUES (p_cliente_nome, p_cliente_telefone, p_cliente_email)
        RETURNING id INTO v_client_id;
    ELSIF p_cliente_email IS NOT NULL AND p_cliente_email != '' THEN
        UPDATE clients SET email = p_cliente_email WHERE id = v_client_id AND (email IS NULL OR email = '');
    END IF;

    -- CONSULTA PLANO DE MENSALISTA ATIVO
    SELECT is_mensalista, mensalista_plan_id, mensalista_expires_at
    INTO v_is_mensalista, v_plan_id, v_expires_at
    FROM clients WHERE id = v_client_id;

    IF v_is_mensalista = TRUE AND (v_expires_at IS NULL OR v_expires_at >= NOW()) AND v_plan_id IS NOT NULL THEN
        SELECT included_service_ids INTO v_plan_services
        FROM mensalista_plans WHERE id = v_plan_id AND is_active = TRUE;
    END IF;

    -- CALCULO DE VALOR E DURACAO NO SERVIDOR
    v_total_calculated_price := 0;

    FOREACH v_service_id IN ARRAY p_servicos LOOP
        SELECT price INTO v_service_price FROM services WHERE id = v_service_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Servico invalido.';
        END IF;
        IF v_is_mensalista = TRUE AND v_plan_services IS NOT NULL AND (v_service_id = ANY(v_plan_services)) THEN
            v_service_price := 0;
        END IF;
        v_total_calculated_price := v_total_calculated_price + v_service_price;
    END LOOP;

    SELECT COALESCE(SUM(duration), 0) INTO v_server_duration
    FROM services WHERE id = ANY(p_servicos);

    -- APLICA CUPOM SE FORNECIDO (validacao 100% server-side)
    IF p_coupon_id IS NOT NULL THEN
        DECLARE
            v_coupon coupons%ROWTYPE;
            v_applicable_price numeric := 0;
        BEGIN
            SELECT * INTO v_coupon FROM coupons WHERE id = p_coupon_id AND is_active = true FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Cupom invalido ou inativo.';
            END IF;
            IF CURRENT_DATE < v_coupon.valid_from THEN
                RAISE EXCEPTION 'Este cupom ainda nao esta ativo.';
            END IF;
            IF v_coupon.valid_until IS NOT NULL AND CURRENT_DATE > v_coupon.valid_until THEN
                RAISE EXCEPTION 'Este cupom expirou.';
            END IF;
            IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
                RAISE EXCEPTION 'Este cupom atingiu o limite de uso.';
            END IF;
            IF array_length(v_coupon.applicable_service_ids, 1) > 0 THEN
                IF NOT (p_servicos <@ v_coupon.applicable_service_ids) THEN
                    RAISE EXCEPTION 'Este cupom nao e valido para os servicos selecionados.';
                END IF;
            END IF;
            IF array_length(v_coupon.applicable_service_ids, 1) > 0 THEN
                SELECT COALESCE(SUM(s.price), 0) INTO v_applicable_price
                FROM services s WHERE s.id = ANY(v_coupon.applicable_service_ids) AND s.id = ANY(p_servicos);
            ELSE
                v_applicable_price := v_total_calculated_price;
            END IF;
            CASE v_coupon.discount_type
                WHEN 'percentage' THEN v_coupon_discount := round(v_applicable_price * v_coupon.discount_value / 100, 2);
                WHEN 'fixed' THEN v_coupon_discount := LEAST(v_coupon.discount_value, v_applicable_price);
                WHEN 'free' THEN v_coupon_discount := v_applicable_price;
            END CASE;
            v_coupon_discount := GREATEST(v_coupon_discount, 0);
            v_total_calculated_price := GREATEST(v_total_calculated_price - v_coupon_discount, 0);
            UPDATE coupons SET current_uses = current_uses + 1 WHERE id = p_coupon_id;
        END;
    END IF;

    p_preco_total := v_total_calculated_price;
    p_duracao_total := v_server_duration;

    -- CRIA O AGENDAMENTO
    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, coupon_id, discount_amount)
    VALUES (v_client_id, p_servicos, p_data, p_hora, p_preco_total, p_duracao_total, 'confirmed', p_coupon_id, v_coupon_discount)
    RETURNING id INTO v_booking_id;

    -- GERA TOKEN UNICO PARA GERENCIAMENTO
    v_token := encode(gen_random_bytes(16), 'hex');
    INSERT INTO booking_tokens (booking_id, token, expires_at)
    VALUES (v_booking_id, v_token, NOW() + INTERVAL '30 days');

    SELECT jsonb_build_object(
        'id', b.id, 'client_id', b.client_id, 'status', b.status, 'token', v_token
    ) INTO v_result FROM bookings b WHERE b.id = v_booking_id;

    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Horario preenchido. Escolha outro.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar agendamento com rate limiting + verificacao de no-show + cupom
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
    p_discount_amount decimal DEFAULT 0
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
        p_coupon_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 2. SLOTS E HORARIOS
-- =========================================================================

CREATE OR REPLACE FUNCTION get_available_slots(p_date date)
RETURNS TABLE(slot_time text) AS $$
DECLARE
    v_opening time; v_closing time; v_day_of_week integer; v_hours_json jsonb;
    v_day_key text; v_day_enabled boolean := false;
    v_lunch_start time; v_lunch_end time; v_lunch_enabled boolean := false; v_lunch_days int[];
BEGIN
    IF p_date < CURRENT_DATE THEN RETURN; END IF;
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
        v_day_enabled := EXISTS (SELECT 1 FROM unnest(string_to_array(COALESCE((SELECT value FROM settings WHERE key = 'working_days'), '1,2,3,4,5,6'), ',')) AS d WHERE d = v_day_key);
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
    IF v_hours_json IS NOT NULL AND v_hours_json ? 'lunch_break' THEN
        v_lunch_enabled := COALESCE((v_hours_json->'lunch_break'->>'enabled')::boolean, false);
        IF v_lunch_enabled THEN
            v_lunch_start := (v_hours_json->'lunch_break'->>'start')::time;
            v_lunch_end := (v_hours_json->'lunch_break'->>'end')::time;
            v_lunch_days := ARRAY(SELECT jsonb_array_elements_text(v_hours_json->'lunch_break'->'days')::int);
        END IF;
    END IF;
    IF NOT v_day_enabled THEN RETURN; END IF;
    RETURN QUERY
    SELECT to_char(slot, 'HH24:MI:SS') AS slot_time
    FROM generate_series(p_date + v_opening, p_date + v_closing - interval '1 second', interval '1 hour') AS slot
    WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.booking_date = p_date AND b.booking_time = slot::time AND b.status != 'cancelled')
    AND (NOT v_lunch_enabled OR NOT (v_day_of_week = ANY(v_lunch_days)) OR slot::time < v_lunch_start OR slot::time >= v_lunch_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_occupied_slots(p_date date)
RETURNS TABLE(booking_time time, status text) AS $$
BEGIN
    RETURN QUERY SELECT b.booking_time, b.status FROM bookings b WHERE b.booking_date = p_date AND b.status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION toggle_slot_block(p_date date, p_time time)
RETURNS jsonb AS $$
DECLARE v_existing_id uuid; v_result jsonb;
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
    SELECT b.id INTO v_existing_id FROM bookings b WHERE b.booking_date = p_date AND b.booking_time = p_time AND b.status != 'cancelled' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        UPDATE bookings SET is_blocked = NOT is_blocked WHERE id = v_existing_id RETURNING id INTO v_existing_id;
        SELECT jsonb_build_object('id', v_existing_id, 'blocked', (SELECT is_blocked FROM bookings WHERE id = v_existing_id)) INTO v_result;
        RETURN v_result;
    ELSE
        INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, is_blocked)
        VALUES (NULL, '{}', p_date, p_time, 0, 0, 'confirmed', true) RETURNING id INTO v_existing_id;
        RETURN jsonb_build_object('id', v_existing_id, 'blocked', true);
    END IF;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Horario em conflito.'; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unblock_day(p_date date)
RETURNS void AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
    UPDATE bookings SET is_blocked = FALSE, status = 'cancelled' WHERE booking_date = p_date AND is_blocked = TRUE AND status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 3. CONSULTAS PUBLICAS
-- =========================================================================

CREATE OR REPLACE FUNCTION get_bookings_by_token(p_token TEXT)
RETURNS TABLE(booking_id UUID, booking_date DATE, booking_time TIME, status TEXT, total_price DECIMAL, total_duration INTEGER, service_names TEXT[], client_name TEXT, client_phone TEXT, is_expired BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.booking_date, b.booking_time, b.status, b.total_price, b.total_duration,
        ARRAY(SELECT s.name FROM services s WHERE s.id = ANY(b.service_ids) ORDER BY s.name),
        c.name, c.phone, (bt.expires_at < NOW())
    FROM booking_tokens bt JOIN bookings b ON b.id = bt.booking_id JOIN clients c ON c.id = b.client_id
    WHERE bt.token = p_token AND b.status IN ('pending', 'confirmed') AND b.booking_date >= CURRENT_DATE
    ORDER BY b.booking_date ASC, b.booking_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION lookup_client_by_phone(p_phone text)
RETURNS TABLE(id UUID, name TEXT, phone TEXT, is_mensalista BOOLEAN, mensalista_plan_id UUID) AS $$
DECLARE v_clean_phone text;
BEGIN
    v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    IF length(v_clean_phone) < 10 OR length(v_clean_phone) > 15 THEN RAISE EXCEPTION 'Numero de telefone invalido.'; END IF;
    IF NOT check_rate_limit('lookup_client:' || v_clean_phone, 10, 60) THEN RAISE EXCEPTION 'Muitas consultas.'; END IF;
    RETURN QUERY SELECT c.id, c.name, c.phone, c.is_mensalista, c.mensalista_plan_id FROM clients c WHERE c.phone = v_clean_phone LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_last_booking_by_phone(p_phone text)
RETURNS TABLE(service_ids UUID[], total_price DECIMAL) AS $$
BEGIN
    RETURN QUERY SELECT b.service_ids, b.total_price FROM bookings b JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_phone AND b.status IN ('pending', 'confirmed', 'completed') ORDER BY b.created_at DESC LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_bookings_by_phone(p_phone text)
RETURNS TABLE(id UUID, booking_date DATE, booking_time TIME, status TEXT, total_price DECIMAL, total_duration INTEGER, service_ids UUID[], clients JSONB, has_token BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.booking_date, b.booking_time, b.status::text, b.total_price, b.total_duration, b.service_ids,
        jsonb_build_object('name', CONCAT(LEFT(c.name, 1), '****'), 'phone', CONCAT(LEFT(c.phone, 3), '****', RIGHT(c.phone, 2))),
        EXISTS(SELECT 1 FROM booking_tokens bt WHERE bt.booking_id = b.id AND bt.expires_at > NOW())
    FROM bookings b JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_phone AND b.status IN ('pending', 'confirmed') AND b.booking_date >= CURRENT_DATE
    ORDER BY b.booking_date ASC, b.booking_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cancel_booking_public(p_booking_id UUID, p_token TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND is_admin() THEN
        UPDATE bookings SET status = 'cancelled' WHERE id = p_booking_id AND status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE;
        RETURN FOUND;
    END IF;
    IF p_token IS NULL OR p_token = '' THEN RAISE EXCEPTION 'Token necessario.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM booking_tokens WHERE booking_id = p_booking_id AND token = p_token AND expires_at > NOW()) THEN
        RAISE EXCEPTION 'Token invalido ou expirado.';
    END IF;
    UPDATE bookings SET status = 'cancelled' WHERE id = p_booking_id AND status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 4. CONFIGURACOES
-- =========================================================================

CREATE OR REPLACE FUNCTION get_business_hours()
RETURNS jsonb AS $$
DECLARE v_result jsonb;
BEGIN
    SELECT jsonb_object_agg(key, value) INTO v_result FROM settings
    WHERE key IN ('opening_time', 'closing_time', 'saturday_opening', 'saturday_closing', 'working_days', 'barber_hours', 'barber_name', 'barber_phone');
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- =========================================================================
-- 5. NO-SHOW
-- =========================================================================

CREATE OR REPLACE FUNCTION is_client_blocked_by_no_show(p_client_id uuid)
RETURNS boolean AS $$
DECLARE v_max integer; v_count integer;
BEGIN
    SELECT COALESCE((SELECT value::integer FROM settings WHERE key = 'max_no_shows'), 3) INTO v_max;
    SELECT COUNT(*) INTO v_count FROM bookings WHERE client_id = p_client_id AND no_show = TRUE AND booking_date >= (CURRENT_DATE - 90);
    RETURN v_count >= v_max;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION check_client_no_show_block(p_client_id uuid)
RETURNS void AS $$
BEGIN
    IF is_client_blocked_by_no_show(p_client_id) THEN RAISE EXCEPTION 'Cliente bloqueado por excesso de faltas.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- =========================================================================
-- 6. FIDELIDADE
-- =========================================================================

CREATE OR REPLACE FUNCTION check_client_milestones(p_client_id uuid)
RETURNS TABLE(milestone_id uuid, visits_required integer, reward_service_id uuid, already_claimed boolean) AS $$
BEGIN
    RETURN QUERY SELECT lm.id, lm.visits_required, lm.reward_service_id, (cm.id IS NOT NULL)
    FROM loyalty_milestones lm LEFT JOIN client_milestones cm ON cm.milestone_id = lm.id AND cm.client_id = p_client_id
    WHERE lm.is_active = true ORDER BY lm.visits_required ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_client_milestones_public(p_client_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_visits INTEGER; v_result jsonb;
BEGIN
    SELECT COALESCE(historical_visits, 0) INTO v_visits FROM clients WHERE id = p_client_id;
    IF NOT FOUND THEN RETURN '[]'::jsonb; END IF;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('milestone', jsonb_build_object('id', lm.id, 'visits_required', lm.visits_required, 'reward_service_id', lm.reward_service_id), 'progress', v_visits, 'already_claimed', (cm.id IS NOT NULL)) ORDER BY lm.visits_required ASC), '[]'::jsonb) INTO v_result
    FROM loyalty_milestones lm LEFT JOIN client_milestones cm ON cm.milestone_id = lm.id AND cm.client_id = p_client_id WHERE lm.is_active = true;
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_client_milestones_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION increment_client_visit(p_client_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE clients SET historical_visits = COALESCE(historical_visits, 0) + 1 WHERE id = p_client_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cliente nao encontrado.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 7. CUPONS
-- =========================================================================

CREATE OR REPLACE FUNCTION validate_coupon(p_code text, p_service_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_coupon coupons%ROWTYPE; v_discount numeric := 0; v_service_price numeric := 0;
BEGIN
    SELECT * INTO v_coupon FROM coupons WHERE upper(code) = upper(trim(p_code)) AND is_active = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'error', 'Cupom nao encontrado.'); END IF;
    IF CURRENT_DATE < v_coupon.valid_from THEN RETURN jsonb_build_object('valid', false, 'error', 'Cupom nao ativo.'); END IF;
    IF v_coupon.valid_until IS NOT NULL AND CURRENT_DATE > v_coupon.valid_until THEN RETURN jsonb_build_object('valid', false, 'error', 'Cupom expirado.'); END IF;
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN RETURN jsonb_build_object('valid', false, 'error', 'Limite de uso atingido.'); END IF;
    IF array_length(v_coupon.applicable_service_ids, 1) > 0 AND array_length(p_service_ids, 1) > 0 THEN
        IF NOT (p_service_ids <@ v_coupon.applicable_service_ids) THEN RETURN jsonb_build_object('valid', false, 'error', 'Cupom nao valido para estes servicos.'); END IF;
    END IF;
    IF array_length(p_service_ids, 1) > 0 THEN
        IF array_length(v_coupon.applicable_service_ids, 1) > 0 THEN
            SELECT COALESCE(SUM(s.price), 0) INTO v_service_price FROM services s WHERE s.id = ANY(v_coupon.applicable_service_ids) AND s.id = ANY(p_service_ids);
        ELSE
            SELECT COALESCE(SUM(s.price), 0) INTO v_service_price FROM services s WHERE s.id = ANY(p_service_ids);
        END IF;
    END IF;
    CASE v_coupon.discount_type
        WHEN 'percentage' THEN v_discount := round(v_service_price * v_coupon.discount_value / 100, 2);
        WHEN 'fixed' THEN v_discount := CASE WHEN v_service_price > 0 THEN LEAST(v_coupon.discount_value, v_service_price) ELSE v_coupon.discount_value END;
        WHEN 'free' THEN v_discount := v_service_price;
    END CASE;
    v_discount := GREATEST(v_discount, 0);
    RETURN jsonb_build_object('valid', true, 'coupon_id', v_coupon.id, 'code', upper(trim(v_coupon.code)), 'discount_type', v_coupon.discount_type, 'discount_value', v_coupon.discount_value, 'discount_amount', v_discount, 'original_price', v_service_price);
END;
$$;

CREATE OR REPLACE FUNCTION apply_coupon(p_coupon_id uuid)
RETURNS void AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Apenas admins.'; END IF;
    UPDATE coupons SET current_uses = current_uses + 1 WHERE id = p_coupon_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cupom nao encontrado.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 8. RATE LIMITING
-- =========================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(p_key text, p_max_attempts integer DEFAULT 5, p_window_seconds integer DEFAULT 900)
RETURNS boolean AS $$
DECLARE v_ip text; v_count integer; v_window_start timestamptz;
BEGIN
    v_ip := COALESCE(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', current_setting('request.headers', true)::jsonb->>'x-real-ip', 'unknown');
    v_ip := split_part(v_ip, ',', 1);
    DELETE FROM rate_limits WHERE key = p_key AND ip_address = v_ip AND created_at < NOW() - (p_window_seconds || ' seconds')::interval;
    SELECT COUNT(*), MIN(window_start) INTO v_count, v_window_start FROM rate_limits WHERE key = p_key AND ip_address = v_ip AND window_start >= NOW() - (p_window_seconds || ' seconds')::interval;
    IF v_count >= p_max_attempts THEN RETURN false; END IF;
    INSERT INTO rate_limits (key, ip_address, attempts, window_start) VALUES (p_key, v_ip, 1, COALESCE(v_window_start, NOW()));
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION lookup_client_by_phone_rate_limited(p_phone text)
RETURNS TABLE(id UUID, name TEXT, phone TEXT, is_mensalista BOOLEAN, mensalista_plan_id UUID) AS $$
BEGIN
    IF NOT check_rate_limit('lookup_client', 10, 60) THEN RAISE EXCEPTION 'Muitas tentativas.'; END IF;
    RETURN QUERY SELECT * FROM lookup_client_by_phone(p_phone);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_bookings_by_phone_rate_limited(p_phone text)
RETURNS TABLE(id UUID, booking_date DATE, booking_time TIME, status TEXT, total_price DECIMAL, total_duration INTEGER, service_ids UUID[], clients JSONB, has_token BOOLEAN) AS $$
BEGIN
    IF NOT check_rate_limit('get_bookings_by_phone', 5, 60) THEN RAISE EXCEPTION 'Muitas tentativas.'; END IF;
    RETURN QUERY SELECT * FROM get_bookings_by_phone(p_phone);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_last_booking_by_phone_rate_limited(p_phone text)
RETURNS TABLE(service_ids UUID[], total_price DECIMAL) AS $$
DECLARE v_allowed boolean;
BEGIN
    SELECT check_rate_limit('get_last_booking_by_phone', 5, 60) INTO v_allowed;
    IF NOT v_allowed THEN RAISE EXCEPTION 'Rate limit exceeded.'; END IF;
    RETURN QUERY SELECT b.service_ids, b.total_price FROM bookings b JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_phone AND b.status IN ('pending', 'confirmed', 'completed') ORDER BY b.created_at DESC LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour'; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 9. PUSH NOTIFICATIONS
-- =========================================================================

CREATE OR REPLACE FUNCTION save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
RETURNS void AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
    INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (p_endpoint, p_p256dh, p_auth)
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_push_subscription(p_endpoint text)
RETURNS void AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
    DELETE FROM push_subscriptions WHERE endpoint = p_endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 10. MANUTENCAO AUTOMATICA
-- =========================================================================

CREATE OR REPLACE FUNCTION completar_agendamentos_expirados()
RETURNS void AS $$
DECLARE v_agora_brt time;
BEGIN
    v_agora_brt := (NOW() AT TIME ZONE 'America/Sao_Paulo')::time;
    UPDATE bookings SET status = 'completed' WHERE booking_date < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date AND status IN ('confirmed', 'pending') AND is_blocked = FALSE;
    UPDATE bookings SET status = 'completed' WHERE booking_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date AND status IN ('confirmed', 'pending') AND is_blocked = FALSE AND (booking_time + (total_duration || ' minutes')::interval) < v_agora_brt;
    UPDATE bookings SET is_blocked = FALSE, status = 'cancelled' WHERE booking_date < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date AND is_blocked = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_block_lunch_break()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_config JSONB; v_lunch JSONB; v_enabled BOOLEAN; v_start TIME; v_end TIME; v_days INT[];
    v_target_dates DATE[]; v_target_date DATE; v_target_dow INT; v_slot TIME; v_blocked_count INT; v_total_blocked INT := 0;
BEGIN
    SELECT value::JSONB INTO v_config FROM settings WHERE key = 'barber_hours' LIMIT 1;
    IF v_config IS NULL THEN RETURN; END IF;
    v_lunch := v_config->'lunch_break'; IF v_lunch IS NULL THEN RETURN; END IF;
    v_enabled := (v_lunch->>'enabled')::BOOLEAN; IF NOT v_enabled THEN RETURN; END IF;
    v_start := (v_lunch->>'start')::TIME; v_end := (v_lunch->>'end')::TIME;
    IF v_start IS NULL OR v_end IS NULL OR v_start >= v_end THEN RETURN; END IF;
    v_days := ARRAY(SELECT jsonb_array_elements_text(v_lunch->'days')::INT);
    v_target_dates := ARRAY[(NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE, (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE + 1];
    FOREACH v_target_date IN ARRAY v_target_dates LOOP
        v_target_dow := EXTRACT(DOW FROM v_target_date)::INT;
        IF array_length(v_days, 1) > 0 AND NOT (v_target_dow = ANY(v_days)) THEN CONTINUE; END IF;
        v_slot := v_start; v_blocked_count := 0;
        WHILE v_slot < v_end LOOP
            IF NOT EXISTS (SELECT 1 FROM bookings WHERE booking_date = v_target_date AND booking_time = v_slot AND status IN ('confirmed', 'pending') AND is_blocked = FALSE) THEN
                IF NOT EXISTS (SELECT 1 FROM bookings WHERE booking_date = v_target_date AND booking_time = v_slot AND is_blocked = TRUE) THEN
                    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, is_blocked)
                    VALUES (NULL, '{}'::UUID[], v_target_date, v_slot, 0, 0, 'confirmed', TRUE);
                    v_blocked_count := v_blocked_count + 1;
                END IF;
            END IF;
            v_slot := v_slot + INTERVAL '1 hour';
        END LOOP;
        IF v_blocked_count > 0 THEN v_total_blocked := v_total_blocked + v_blocked_count; END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION verificar_mensalistas()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_client RECORD; v_title TEXT; v_body TEXT; v_tag TEXT; v_days INTEGER;
BEGIN
    FOR v_client IN SELECT id, name, mensalista_expires_at FROM clients
    WHERE is_mensalista = true AND mensalista_expires_at IS NOT NULL
    AND mensalista_expires_at <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date + 3
    AND mensalista_expires_at >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    LOOP
        v_days := v_client.mensalista_expires_at - (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
        IF v_days = 0 THEN
            v_title := 'Mensalidade vence hoje!'; v_body := format('A mensalidade de %s vence hoje!', v_client.name);
            v_tag := format('mensalidade-hoje-%s', v_client.id);
        ELSE
            v_title := 'Mensalidade perto de vencer!'; v_body := format('A mensalidade de %s vence em %s dias!', v_client.name, v_days);
            v_tag := format('mensalidade-alerta-%s', v_client.id);
        END IF;
        PERFORM net.http_post(url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push',
            headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
            body := jsonb_build_object('title', v_title, 'body', v_body, 'tag', v_tag)::text);
    END LOOP;
    UPDATE clients SET is_mensalista = false, mensalista_plan_id = NULL, mensalista_expires_at = NULL
    WHERE is_mensalista = true AND mensalista_expires_at IS NOT NULL AND mensalista_expires_at < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
END;
$$;

CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'; END;
$$;

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN DELETE FROM booking_tokens WHERE expires_at < NOW(); END;
$$;

CREATE OR REPLACE FUNCTION preserve_client_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_cutoff DATE; v_client RECORD; v_old_stats RECORD;
BEGIN
    v_cutoff := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '6 months';
    FOR v_client IN SELECT DISTINCT client_id FROM bookings WHERE booking_date < v_cutoff AND status = 'completed' AND is_blocked = FALSE AND stats_preserved = FALSE AND client_id IS NOT NULL LOOP
        SELECT COUNT(*) as visit_count, COALESCE(SUM(total_price), 0) as total_spent, MAX(booking_date) as last_date INTO v_old_stats
        FROM bookings WHERE client_id = v_client.client_id AND booking_date < v_cutoff AND status = 'completed' AND is_blocked = FALSE AND stats_preserved = FALSE;
        IF v_old_stats.visit_count > 0 THEN
            UPDATE clients SET historical_visits = COALESCE(historical_visits, 0) + v_old_stats.visit_count, historical_spent = COALESCE(historical_spent, 0) + v_old_stats.total_spent,
                last_visit_date = GREATEST(COALESCE(last_visit_date, '1900-01-01'::date), v_old_stats.last_date) WHERE id = v_client.client_id;
            UPDATE bookings SET stats_preserved = TRUE WHERE client_id = v_client.client_id AND booking_date < v_cutoff AND status = 'completed' AND is_blocked = FALSE AND stats_preserved = FALSE;
        END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_booking_cutoff DATE; v_audit_cutoff TIMESTAMPTZ; v_deleted_bookings INTEGER; v_deleted_logs INTEGER;
BEGIN
    v_booking_cutoff := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '6 months';
    v_audit_cutoff := NOW() - INTERVAL '90 days';
    PERFORM preserve_client_stats();
    DELETE FROM bookings WHERE booking_date < v_booking_cutoff AND status IN ('completed', 'cancelled') AND is_blocked = FALSE;
    GET DIAGNOSTICS v_deleted_bookings = ROW_COUNT;
    DELETE FROM audit_logs WHERE created_at < v_audit_cutoff;
    GET DIAGNOSTICS v_deleted_logs = ROW_COUNT;
END;
$$;

CREATE OR REPLACE FUNCTION send_weekly_report()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_week_start DATE; v_week_end DATE; v_revenue DECIMAL(10,2); v_completed INTEGER; v_cancelled INTEGER;
    v_top_name TEXT; v_top_count INTEGER; v_new INTEGER; v_name TEXT; v_body TEXT; v_rec RECORD;
BEGIN
    v_week_end := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - 1;
    v_week_start := v_week_end - (EXTRACT(DOW FROM v_week_end)::INT + 6) % 7;
    SELECT value INTO v_name FROM settings WHERE key = 'barber_name' LIMIT 1;
    IF v_name IS NULL OR v_name = '' THEN v_name := 'Barbeiro'; END IF;
    SELECT COALESCE(SUM(total_price), 0), COUNT(*) FILTER (WHERE status = 'completed'), COUNT(*) FILTER (WHERE status = 'cancelled')
    INTO v_revenue, v_completed, v_cancelled FROM bookings WHERE booking_date >= v_week_start AND booking_date <= v_week_end AND is_blocked = FALSE;
    v_top_name := '-'; v_top_count := 0;
    FOR v_rec IN SELECT s.name, COUNT(*) as cnt FROM bookings b JOIN unnest(b.service_ids) AS sid ON TRUE JOIN services s ON s.id = sid
    WHERE b.booking_date >= v_week_start AND b.booking_date <= v_week_end AND b.status = 'completed' AND b.is_blocked = FALSE GROUP BY s.name ORDER BY cnt DESC LIMIT 1
    LOOP v_top_name := v_rec.name; v_top_count := v_rec.cnt; END LOOP;
    SELECT COUNT(*) INTO v_new FROM clients WHERE created_at >= v_week_start AND created_at < v_week_start + INTERVAL '7 days';
    v_body := format('Ola, %s! Resumo da semana (%s a %s):' || chr(10) || chr(10) || 'Faturamento: R$ %s' || chr(10) || 'Atendimentos: %s' || chr(10) || 'Cancelamentos: %s' || chr(10) || 'Servico mais pedido: %s (%sx)' || chr(10) || 'Clientes novos: %s',
        v_name, to_char(v_week_start, 'DD/MM'), to_char(v_week_end, 'DD/MM'), to_char(v_revenue, 'FM999G990D00'), v_completed, v_cancelled, v_top_name, v_top_count, v_new);
    PERFORM net.http_post(url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
        body := jsonb_build_object('title', 'Relatorio Semanal', 'body', v_body, 'tag', 'weekly-report-' || to_char(v_week_start, 'YYYY-MM-DD'))::text);
END;
$$;

-- =========================================================================
-- 11. HEALTH CHECK
-- =========================================================================

CREATE OR REPLACE FUNCTION health_check()
RETURNS jsonb AS $$
DECLARE v_status TEXT := 'ok'; v_s INTEGER; v_b INTEGER; v_c INTEGER;
BEGIN
    BEGIN SELECT COUNT(*) INTO v_s FROM services; SELECT COUNT(*) INTO v_b FROM bookings; SELECT COUNT(*) INTO v_c FROM clients;
    EXCEPTION WHEN OTHERS THEN v_status := 'error'; END;
    RETURN jsonb_build_object('status', v_status, 'timestamp', NOW(), 'version', '3.22.0',
        'database', jsonb_build_object('services', v_s, 'bookings', v_b, 'clients', v_c),
        'uptime', EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time()))::integer);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
