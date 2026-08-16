-- =========================================================================
-- BLACK DIAMOND - 006 AGENDA DURATION AUTH
-- CONFLITO POR DURAÇÃO + SUPABASE AUTH
-- =========================================================================
-- Consolidado de: 018_duration_overlap.sql, 019_client_supabase_auth.sql
-- Unificado na consolidação 2026-08-15 — conteúdo preservado na ordem
-- original de execução (idempotente, CREATE OR REPLACE / IF NOT EXISTS).
-- =========================================================================

-- >>> MIGRATION: 018_duration_overlap.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 018 - CONFLITO POR DURAÇÃO (sobreposição de agendamentos)
-- =========================================================================
-- Contexto: a grade de horários é de hora em hora, mas os serviços podem ser
-- combinados (ex: Corte 40min + Barba 30min = 70min). Antes desta migration,
-- o sistema só verificava conflito quando o horário de INÍCIO coincidia:
--   - criar_agendamento: b.booking_time = p_hora
--   - get_available_slots: b.booking_time = slot::time
-- Isso permitia sobreposição: um cliente agendado às 09:00 com 70min de
-- serviço terminava às 10:10, e o horário das 10:00 continuava sendo
-- oferecido → dois clientes sobrepostos.
--
-- Agora o conflito é por INTERVALO:
--   novo agendamento [p_hora, p_hora + duracao)
--   booking existente [b.booking_time, b.booking_time + duracao_existente)
--   conflita se novo_inicio < fim_existente AND inicio_existente < novo_fim
--
-- Duração existente: usa b.total_duration real; bloqueios (is_blocked) e
-- bookings legados sem duração são tratados como 60min (um slot).
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. get_available_slots — aceita a duração do agendamento pretendido
--    (p_duration, default 60) e exclui slots onde um booking dessa duração
--    sobreporia um agendamento existente.
--
-- IMPORTANTE: a assinatura antiga (p_date, p_barber_id) precisa ser DROPada,
-- senão vira overload e a chamada com 1 argumento fica ambígua (42725).
-- ──────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_available_slots(date, uuid);
DROP FUNCTION IF EXISTS get_available_slots(date, uuid, integer);

CREATE OR REPLACE FUNCTION get_available_slots(p_date date, p_barber_id uuid DEFAULT NULL, p_duration integer DEFAULT 60)
RETURNS TABLE(slot_time text) AS $$
DECLARE
    v_opening time; v_closing time; v_day_of_week integer; v_hours_json jsonb;
    v_day_key text; v_day_enabled boolean := false;
    v_lunch_start time; v_lunch_end time; v_lunch_enabled boolean := false; v_lunch_days int[];
BEGIN
    IF p_date < CURRENT_DATE THEN RETURN; END IF;
    v_day_of_week := EXTRACT(DOW FROM p_date);
    v_day_key := v_day_of_week::text;
    -- Horário do barbeiro (override) ou padrão global da barbearia
    IF p_barber_id IS NOT NULL THEN
        SELECT barber_hours INTO v_hours_json FROM barbers WHERE id = p_barber_id;
    END IF;
    IF v_hours_json IS NULL THEN
        v_hours_json := (SELECT value::jsonb FROM settings WHERE key = 'barber_hours');
    END IF;
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
    IF p_duration IS NULL OR p_duration < 1 THEN p_duration := 60; END IF;
    RETURN QUERY
    SELECT to_char(slot, 'HH24:MI:SS') AS slot_time
    FROM generate_series(p_date + v_opening, p_date + v_closing - interval '1 second', interval '1 hour') AS slot
    WHERE NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.booking_date = p_date
        AND b.status != 'cancelled'
        AND (
            -- Barbeiro específico: bloqueia o barbeiro OU bloqueio global (NULL)
            p_barber_id IS NOT NULL AND (b.barber_id = p_barber_id OR b.barber_id IS NULL)
            -- Consulta global (sem barbeiro): qualquer booking bloqueia
            OR p_barber_id IS NULL
        )
        -- Sobreposição por intervalo: slot pretendido [slot, slot + p_duration)
        -- colide com booking existente [b.booking_time, b.booking_time + dur)
        AND slot::time < b.booking_time + (COALESCE(NULLIF(b.total_duration, 0), 60) * interval '1 minute')
        AND b.booking_time < slot::time + (p_duration * interval '1 minute')
    )
    AND (NOT v_lunch_enabled OR NOT (v_day_of_week = ANY(v_lunch_days)) OR slot::time < v_lunch_start OR slot::time >= v_lunch_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_available_slots(date, uuid, integer) TO anon, authenticated, service_role;

-- ──────────────────────────────────────────────────────────────────────
-- 2. criar_agendamento — conflito por intervalo (mesma assinatura)
-- ──────────────────────────────────────────────────────────────────────
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
    p_barber_id uuid DEFAULT NULL
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

    -- Horário do barbeiro (override) ou padrão global da barbearia
    IF p_barber_id IS NOT NULL THEN
        SELECT barber_hours INTO v_hours_json FROM barbers WHERE id = p_barber_id;
    END IF;
    IF v_hours_json IS NULL THEN
        v_hours_json := (SELECT value::jsonb FROM settings WHERE key = 'barber_hours');
    END IF;

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

    -- DURACAO TOTAL (server-side) — fonte da verdade para o conflito por intervalo
    SELECT COALESCE(SUM(duration), 0) INTO v_server_duration
    FROM services WHERE id = ANY(p_servicos);

    -- CONFLITO DE HORARIO POR SOBREPOSICAO (multi-barbeiro):
    -- o novo agendamento [p_hora, p_hora + duracao) não pode colidir com um
    -- booking não-cancelado do MESMO barbeiro (ou bloqueio global barber_id NULL).
    -- Duração de bookings legados/bloqueios sem total_duration: 60min.
    IF EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.booking_date = p_data
        AND b.status != 'cancelled'
        AND (
            p_barber_id IS NOT NULL AND (b.barber_id = p_barber_id OR b.barber_id IS NULL)
            OR p_barber_id IS NULL
        )
        AND p_hora < b.booking_time + (COALESCE(NULLIF(b.total_duration, 0), 60) * interval '1 minute')
        AND b.booking_time < p_hora + (v_server_duration * interval '1 minute')
    ) THEN
        RAISE EXCEPTION 'Horario preenchido. Escolha outro.';
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
    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, coupon_id, discount_amount, barber_id)
    VALUES (v_client_id, p_servicos, p_data, p_hora, p_preco_total, p_duracao_total, 'confirmed', p_coupon_id, v_coupon_discount, p_barber_id)
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

GRANT EXECUTE ON FUNCTION criar_agendamento(text, text, uuid[], date, time without time zone, numeric, integer, text, uuid, uuid) TO anon, authenticated, service_role;

-- >>> MIGRATION: 019_client_supabase_auth.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 019 - INTEGRAÇÃO CONTA DO CLIENTE COM SUPABASE AUTH
-- =========================================================================
-- Requisitos:
--   1. Tabela `clients` possui `user_id` (UUID -> auth.users) nullable.
--   2. Permite clientes sem conta (user_id = NULL).
--   3. Ao criar conta no Supabase Auth, vincula user_id ao cliente existente pelo WhatsApp/E-mail ou cria novo.
--   4. RLS estrito: Cliente logado só acessa seus próprios dados e agendamentos.
-- =========================================================================

-- 1. Coluna user_id em clients e bookings (se ainda não existir)
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- 2. RPC para sincronizar/vincular Supabase Auth user_id à tabela clients (sem duplicatas)
CREATE OR REPLACE FUNCTION public.sync_client_user(
    p_name text,
    p_phone text,
    p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id uuid;
    v_clean_phone text;
    v_clean_email text;
    v_clean_name text;
    v_client public.clients%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Usuário não autenticado.');
    END IF;

    v_clean_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    v_clean_email := lower(trim(coalesce(p_email, '')));
    v_clean_name := trim(coalesce(p_name, ''));

    -- 1. Verifica se o user_id já está vinculado a um registro em clients
    SELECT * INTO v_client
    FROM public.clients
    WHERE user_id = v_user_id AND deleted_at IS NULL
    LIMIT 1;

    IF FOUND THEN
        -- Atualiza nome, telefone ou e-mail caso tenham mudado
        UPDATE public.clients
        SET name = CASE WHEN v_clean_name <> '' THEN v_clean_name ELSE name END,
            phone = CASE WHEN length(v_clean_phone) >= 10 THEN v_clean_phone ELSE phone END,
            email = CASE WHEN v_clean_email <> '' THEN v_clean_email ELSE email END
        WHERE id = v_client.id
        RETURNING * INTO v_client;

        RETURN jsonb_build_object(
            'ok', true,
            'client_id', v_client.id,
            'name', v_client.name,
            'phone', v_client.phone,
            'email', v_client.email,
            'user_id', v_client.user_id
        );
    END IF;

    -- 2. Se não está vinculado por user_id, busca por WhatsApp (telefone) existente
    IF length(v_clean_phone) >= 10 THEN
        SELECT * INTO v_client
        FROM public.clients
        WHERE phone = v_clean_phone AND deleted_at IS NULL
        LIMIT 1;
    END IF;

    -- 3. Se não achou por telefone, tenta por e-mail
    IF v_client.id IS NULL AND v_clean_email <> '' THEN
        SELECT * INTO v_client
        FROM public.clients
        WHERE lower(email) = v_clean_email AND deleted_at IS NULL
        LIMIT 1;
    END IF;

    -- 4. Se achou um cliente existente sem user_id (ou com user_id nulo), vincula!
    IF v_client.id IS NOT NULL THEN
        UPDATE public.clients
        SET user_id = v_user_id,
            email = CASE WHEN v_clean_email <> '' THEN v_clean_email ELSE email END,
            name = CASE WHEN v_clean_name <> '' THEN v_clean_name ELSE name END
        WHERE id = v_client.id
        RETURNING * INTO v_client;

        RETURN jsonb_build_object(
            'ok', true,
            'client_id', v_client.id,
            'name', v_client.name,
            'phone', v_client.phone,
            'email', v_client.email,
            'user_id', v_client.user_id,
            'linked', true
        );
    END IF;

    -- 5. Caso contrário, cria um novo cliente vinculado ao user_id
    INSERT INTO public.clients (
        name,
        phone,
        email,
        user_id
    ) VALUES (
        CASE WHEN v_clean_name <> '' THEN v_clean_name ELSE 'Cliente' END,
        v_clean_phone,
        NULLIF(v_clean_email, ''),
        v_user_id
    )
    RETURNING * INTO v_client;

    RETURN jsonb_build_object(
        'ok', true,
        'client_id', v_client.id,
        'name', v_client.name,
        'phone', v_client.phone,
        'email', v_client.email,
        'user_id', v_client.user_id,
        'created', true
    );
END;
$$;

-- 3. RPC para buscar perfil do cliente logado (get_my_client_profile)
CREATE OR REPLACE FUNCTION public.get_my_client_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id uuid;
    v_client public.clients%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Não autenticado');
    END IF;

    SELECT * INTO v_client
    FROM public.clients
    WHERE user_id = v_user_id AND deleted_at IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Perfil de cliente não encontrado');
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'client_id', v_client.id,
        'name', v_client.name,
        'phone', v_client.phone,
        'email', v_client.email,
        'is_mensalista', v_client.is_mensalista,
        'loyalty_stamps', coalesce(v_client.loyalty_stamps, 0),
        'created_at', v_client.created_at
    );
END;
$$;

-- 4. RPC para buscar agendamentos do cliente logado (get_my_client_bookings)
CREATE OR REPLACE FUNCTION public.get_my_client_bookings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id uuid;
    v_client_id uuid;
    v_bookings jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Não autenticado');
    END IF;

    SELECT id INTO v_client_id
    FROM public.clients
    WHERE user_id = v_user_id AND deleted_at IS NULL
    LIMIT 1;

    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('ok', true, 'bookings', '[]'::jsonb);
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', b.id,
            'booking_date', b.booking_date,
            'booking_time', b.booking_time,
            'status', b.status,
            'total_price', b.total_price,
            'service_name', s.name,
            'barber_name', barb.name,
            'created_at', b.created_at
        ) ORDER BY b.booking_date DESC, b.booking_time DESC
    ) INTO v_bookings
    FROM public.bookings b
    LEFT JOIN public.services s ON s.id = b.service_id
    LEFT JOIN public.barbers barb ON barb.id = b.barber_id
    WHERE b.client_id = v_client_id OR b.user_id = v_user_id;

    RETURN jsonb_build_object(
        'ok', true,
        'bookings', coalesce(v_bookings, '[]'::jsonb)
    );
END;
$$;

-- 5. Atualizar RLS da tabela public.clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients select own or admin" ON public.clients;
CREATE POLICY "Clients select own or admin" ON public.clients
    FOR SELECT
    USING (
        public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Clients update own or admin" ON public.clients;
CREATE POLICY "Clients update own or admin" ON public.clients
    FOR UPDATE
    USING (
        public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    )
    WITH CHECK (
        public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );

-- 6. Atualizar RLS da tabela public.bookings para clientes logados
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bookings select client or admin" ON public.bookings;
CREATE POLICY "Bookings select client or admin" ON public.bookings
    FOR SELECT
    USING (
        public.is_admin() OR 
        (auth.uid() IS NOT NULL AND (
            user_id = auth.uid() OR 
            client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
        ))
    );

DROP POLICY IF EXISTS "Bookings update client or admin" ON public.bookings;
CREATE POLICY "Bookings update client or admin" ON public.bookings
    FOR UPDATE
    USING (
        public.is_admin() OR 
        (auth.uid() IS NOT NULL AND (
            user_id = auth.uid() OR 
            client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
        ))
    );

GRANT EXECUTE ON FUNCTION public.sync_client_user(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_my_client_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_client_bookings() TO authenticated;
