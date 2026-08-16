-- =========================================================================
-- BLACK DIAMOND - 005 CONTA CLIENTE V2
-- CONTA DO CLIENTE V2 (LOGIN, HORÁRIOS, RECUPERAÇÃO, E-MAIL)
-- =========================================================================
-- Consolidado de: 014_login_contas.sql, 015_barber_hours.sql, 016_conta_cliente_recuperacao.sql, 017_conta_cliente_email_dashboard.sql
-- Unificado na consolidação 2026-08-15 — conteúdo preservado na ordem
-- original de execução (idempotente, CREATE OR REPLACE / IF NOT EXISTS).
-- =========================================================================

-- >>> MIGRATION: 014_login_contas.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 014 - PORTAS DE ACESSO: CONTA DO CLIENTE + RESOLVEDOR
-- =========================================================================
-- Contexto: o cliente entrava só com celular (sem senha). Agora:
--   1. `clients` ganha password_hash (bcrypt) — conta OPCIONAL do cliente.
--      Quem não criar senha continua entrando só com o celular (atrito zero).
--   2. Barbeiro/admin pode entrar por NOME, TELEFONE ou E-MAIL + senha:
--      `resolver_login_profissional` acha a conta e devolve o e-mail do auth.
--
-- Segurança:
--   - Senha SEMPRE bcrypt (pgcrypto.crypt/gen_salt) — nunca texto puro.
--   - RPCs SECURITY DEFINER com search_path controlado.
--   - Celular NUNCA dá acesso administrativo (resolver só devolve e-mail).
--   - Rate limit via check_rate_limit (já existente) no login por senha.
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 0. EXTENSÃO pgcrypto (bcrypt) — se já existir, não faz nada
-- ──────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- 1. COLUNAS DE CONTA NA TABELA clients
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS password_hash text,
    ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

-- ──────────────────────────────────────────────────────────────────────
-- 2. RPC: criar/alterar senha do cliente (bcrypt)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.criar_senha_cliente(p_phone text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_client_id uuid;
    v_name text;
    v_allowed boolean;
BEGIN
    p_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

    IF length(p_phone) < 11 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;

    IF p_password IS NULL OR length(p_password) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'A senha precisa ter pelo menos 6 caracteres.');
    END IF;

    -- Rate limit: máx 5 tentativas por minuto
    BEGIN
        SELECT public.check_rate_limit('criar_senha_cliente', 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    SELECT id, name INTO v_client_id, v_name
    FROM public.clients
    WHERE phone = p_phone AND deleted_at IS NULL
    LIMIT 1;

    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado. Faça um agendamento primeiro.');
    END IF;

    UPDATE public.clients
    SET password_hash = crypt(p_password, gen_salt('bf', 10)),
        password_set_at = now()
    WHERE id = v_client_id;

    RETURN jsonb_build_object('ok', true, 'name', v_name, 'has_password', true);
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 3. RPC: verificar senha do cliente (login por celular/nome + senha)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verificar_senha_cliente(p_phone text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_client public.clients%ROWTYPE;
    v_allowed boolean;
BEGIN
    p_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

    IF length(p_phone) < 11 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;

    SELECT * INTO v_client
    FROM public.clients
    WHERE phone = p_phone AND deleted_at IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    IF v_client.password_hash IS NULL THEN
        -- Cliente não tem senha → o app entra direto (atrito zero)
        RETURN jsonb_build_object(
            'ok', false,
            'needs_password', false,
            'name', v_client.name,
            'message', 'Cliente sem senha.'
        );
    END IF;

    -- Rate limit no login por senha
    BEGIN
        SELECT public.check_rate_limit('login_cliente', 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'needs_password', true, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    IF v_client.password_hash = crypt(coalesce(p_password, ''), v_client.password_hash) THEN
        RETURN jsonb_build_object(
            'ok', true,
            'client_id', v_client.id,
            'name', v_client.name,
            'phone', v_client.phone,
            'needs_password', true
        );
    END IF;

    RETURN jsonb_build_object('ok', false, 'needs_password', true, 'message', 'Senha incorreta.');
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 4. RPC: buscar clientes por NOME (login por nome + desambiguação)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.buscar_cliente_por_nome(p_nome text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_matches jsonb;
BEGIN
    v_matches := (
        SELECT jsonb_agg(row_to_json(t))
        FROM (
            SELECT
                c.id,
                c.name,
                c.phone,
                '(' || left(regexp_replace(c.phone, '\D', '', 'g'), 2)
                    || ') *****-**'
                    || right(regexp_replace(c.phone, '\D', '', 'g'), 2) AS phone_masked,
                (c.password_hash IS NOT NULL) AS has_password
            FROM public.clients c
            WHERE c.deleted_at IS NULL
              AND (
                  lower(c.name) LIKE lower(trim(p_nome)) || '%'
                  OR lower(c.name) = lower(trim(p_nome))
              )
            ORDER BY c.name
            LIMIT 5
        ) t
    );
    RETURN coalesce(v_matches, jsonb_build_array());
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 5. RPC: resolvedor de identidade para PROFISSIONAIS (barbeiros/admins)
--    Entrada: nome, telefone ou e-mail. Saída: {type, email, name, phone}
--    O e-mail devolvido alimenta o signInWithPassword do Supabase Auth.
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolver_login_profissional(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_email text;
    v_name text;
    v_phone text;
    v_count integer;
    v_digits text;
BEGIN
    p_identifier := trim(coalesce(p_identifier, ''));

    IF p_identifier = '' THEN
        RETURN jsonb_build_object('type', 'none');
    END IF;

    -- 1. E-MAIL (contém @)
    IF p_identifier LIKE '%@%' THEN
        SELECT u.email, b.name, b.phone INTO v_email, v_name, v_phone
        FROM public.barbers b
        JOIN auth.users u ON u.id = b.user_id
        WHERE lower(u.email) = lower(p_identifier) AND b.is_active = true
        LIMIT 1;
        IF FOUND THEN
            RETURN jsonb_build_object('type', 'profissional', 'email', v_email, 'name', v_name, 'phone', v_phone);
        END IF;
        RETURN jsonb_build_object('type', 'none');
    END IF;

    -- 2. TELEFONE (só dígitos)
    IF p_identifier ~ '^[0-9+()\- ]+$' THEN
        v_digits := regexp_replace(p_identifier, '\D', '', 'g');
        SELECT u.email, b.name, b.phone INTO v_email, v_name, v_phone
        FROM public.barbers b
        JOIN auth.users u ON u.id = b.user_id
        WHERE regexp_replace(coalesce(b.phone, ''), '\D', '', 'g') = v_digits
          AND b.is_active = true
        LIMIT 1;
        IF FOUND THEN
            RETURN jsonb_build_object('type', 'profissional', 'email', v_email, 'name', v_name, 'phone', v_phone);
        END IF;
        RETURN jsonb_build_object('type', 'none');
    END IF;

    -- 3. NOME (sem @ e sem dígitos)
    SELECT count(*) INTO v_count
    FROM public.barbers
    WHERE lower(name) = lower(p_identifier) AND is_active = true;

    IF v_count = 1 THEN
        SELECT u.email, b.name, b.phone INTO v_email, v_name, v_phone
        FROM public.barbers b
        JOIN auth.users u ON u.id = b.user_id
        WHERE lower(b.name) = lower(p_identifier) AND b.is_active = true
        LIMIT 1;
        RETURN jsonb_build_object('type', 'profissional', 'email', v_email, 'name', v_name, 'phone', v_phone);
    ELSIF v_count > 1 THEN
        -- Ambiguidade: devolve a lista para o app desambiguar
        RETURN jsonb_build_object('type', 'ambiguous', 'matches', (
            SELECT jsonb_agg(jsonb_build_object(
                'email', u.email,
                'name', b.name,
                'phone', b.phone
            ))
            FROM public.barbers b
            JOIN auth.users u ON u.id = b.user_id
            WHERE lower(b.name) = lower(p_identifier) AND b.is_active = true
        ));
    END IF;

    RETURN jsonb_build_object('type', 'none');
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 6. GRANTS — acesso público (anon) e autenticado
-- ──────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.criar_senha_cliente(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_senha_cliente(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_cliente_por_nome(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_login_profissional(text) TO anon, authenticated;

-- >>> MIGRATION: 015_barber_hours.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 015 - HORÁRIO POR BARBEIRO (override opcional)
-- =========================================================================
-- Contexto: a barbearia tem um horário padrão (settings.barber_hours) que
-- vale para TODOS os barbeiros. Agora cada barbeiro pode ter o PRÓPRIO
-- horário (mesmo formato JSON do padrão, incluindo lunch_break):
--   - barbers.barber_hours = NULL   → usa o horário padrão da barbearia
--   - barbers.barber_hours = {...}  → usa o horário personalizado do barbeiro
--
-- O conflito de agenda já era por barbeiro (migration 013): um cliente
-- agendado com o Tato às 14h NÃO bloqueia o outro barbeiro às 14h.
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. Coluna de horário próprio no barbeiro
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS barber_hours jsonb;

-- ──────────────────────────────────────────────────────────────────────
-- 2. get_available_slots — usa o horário do barbeiro quando ele tem override
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_available_slots(p_date date, p_barber_id uuid DEFAULT NULL)
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
    RETURN QUERY
    SELECT to_char(slot, 'HH24:MI:SS') AS slot_time
    FROM generate_series(p_date + v_opening, p_date + v_closing - interval '1 second', interval '1 hour') AS slot
    WHERE NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.booking_date = p_date
        AND b.booking_time = slot::time
        AND b.status != 'cancelled'
        AND (
            -- Barbeiro específico: bloqueia o barbeiro OU bloqueio global (NULL)
            p_barber_id IS NOT NULL AND (b.barber_id = p_barber_id OR b.barber_id IS NULL)
            -- Consulta global (sem barbeiro): qualquer booking bloqueia
            OR p_barber_id IS NULL
        )
    )
    AND (NOT v_lunch_enabled OR NOT (v_day_of_week = ANY(v_lunch_days)) OR slot::time < v_lunch_start OR slot::time >= v_lunch_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 3. criar_agendamento — validação de horário usa o override do barbeiro
--    (mesmo comportamento, apenas a fonte do horário muda)
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

    -- CONFLITO DE HORARIO (multi-barbeiro):
    -- bloqueia o horário se já houver booking não-cancelado do MESMO barbeiro
    -- ou um booking GLOBAL (barber_id NULL — bloqueio/almoço/legado).
    IF EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.booking_date = p_data
        AND b.booking_time = p_hora
        AND b.status != 'cancelled'
        AND (
            p_barber_id IS NOT NULL AND (b.barber_id = p_barber_id OR b.barber_id IS NULL)
            OR p_barber_id IS NULL
        )
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

-- ──────────────────────────────────────────────────────────────────────
-- 4. upsert_barber — aceita working_days / barber_hours por barbeiro
--    (DROP antes para trocar a assinatura com segurança; re-grant de EXECUTE)
-- ──────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS upsert_barber(uuid, uuid, text, text, text, text, text, boolean, boolean, integer);

CREATE FUNCTION upsert_barber(
    p_id uuid DEFAULT NULL,
    p_user_id uuid DEFAULT NULL,
    p_name text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_photo_url text DEFAULT NULL,
    p_bio text DEFAULT NULL,
    p_quote text DEFAULT NULL,
    p_is_active boolean DEFAULT true,
    p_is_owner boolean DEFAULT false,
    p_sort_order integer DEFAULT 0,
    p_working_days jsonb DEFAULT NULL,
    p_barber_hours jsonb DEFAULT NULL,
    p_use_default_hours boolean DEFAULT false
) RETURNS uuid AS $$
DECLARE
    v_barber_id uuid;
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
            sort_order = COALESCE(p_sort_order, sort_order),
            working_days = COALESCE(p_working_days, working_days),
            -- p_use_default_hours = true → volta ao horário padrão da barbearia
            barber_hours = CASE
                WHEN p_use_default_hours THEN NULL
                ELSE COALESCE(p_barber_hours, barber_hours)
            END
        WHERE id = p_id
        RETURNING id INTO v_barber_id;
    ELSE
        INSERT INTO barbers (user_id, name, phone, photo_url, bio, quote, is_active, is_owner, sort_order, working_days, barber_hours)
        VALUES (
            p_user_id, p_name, p_phone, p_photo_url, p_bio, p_quote,
            p_is_active, p_is_owner, p_sort_order,
            p_working_days,
            CASE WHEN p_use_default_hours THEN NULL ELSE p_barber_hours END
        )
        RETURNING id INTO v_barber_id;
    END IF;

    RETURN v_barber_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_barber(uuid, uuid, text, text, text, text, text, boolean, boolean, integer, jsonb, jsonb, boolean) TO anon, authenticated, service_role;

-- >>> MIGRATION: 016_conta_cliente_recuperacao.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 016 - CONTA DO CLIENTE + RECUPERAÇÃO DE SENHA
-- =========================================================================
-- Turbina o login de cliente (que já é por telefone + senha bcrypt opcional):
--   1. Recuperação de senha por CÓDIGO (6 dígitos, expira em 15 min, hash
--      sha256 no banco). A entrega do código é feita pela edge function
--      `cliente-recuperar-senha` (e-mail grátis via MailerSend).
--   2. Conta completa: criar conta com nome + e-mail + telefone + senha
--      (herda o histórico se o telefone já existe) e login por e-mail OU
--      telefone.
--   3. Admin pode limpar a senha de um cliente (fallback de recuperação).
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. Tabela de tokens de recuperação (RLS ON, sem policies → só service
--    role/edge function acessa; anon não enxerga nada)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_reset_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_reset_tokens_client ON client_reset_tokens(client_id);

ALTER TABLE client_reset_tokens ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────
-- 2. verificar_login_cliente — login por telefone OU e-mail + senha
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION verificar_login_cliente(p_identifier text, p_password text)
RETURNS jsonb AS $$
DECLARE
    v_client public.clients%ROWTYPE;
    v_allowed boolean;
    v_ident text;
BEGIN
    v_ident := regexp_replace(coalesce(p_identifier, ''), '\s', '', 'g');
    IF v_ident = '' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Informe telefone ou e-mail.');
    END IF;

    IF v_ident LIKE '%@%' THEN
        SELECT * INTO v_client FROM public.clients
        WHERE lower(email) = lower(v_ident) AND deleted_at IS NULL LIMIT 1;
    ELSE
        v_ident := regexp_replace(v_ident, '\D', '', 'g');
        IF length(v_ident) < 11 THEN
            RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
        END IF;
        SELECT * INTO v_client FROM public.clients
        WHERE phone = v_ident AND deleted_at IS NULL LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Não encontramos uma conta com esse telefone/e-mail.');
    END IF;

    IF v_client.password_hash IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 'needs_password', false,
            'name', v_client.name, 'phone', v_client.phone,
            'message', 'Sem senha cadastrada.'
        );
    END IF;

    BEGIN
        SELECT public.check_rate_limit('login_cliente:' || v_client.phone, 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'needs_password', true, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    IF v_client.password_hash = crypt(coalesce(p_password, ''), v_client.password_hash) THEN
        RETURN jsonb_build_object('ok', true, 'name', v_client.name, 'phone', v_client.phone);
    END IF;

    RETURN jsonb_build_object('ok', false, 'needs_password', true, 'message', 'Senha incorreta.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 3. criar_conta_cliente — conta completa (nome + e-mail + telefone + senha)
--    Se o telefone já existe → vincula e herda o histórico.
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION criar_conta_cliente(p_nome text, p_email text, p_telefone text, p_senha text)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
    v_name text;
    v_phone text;
    v_allowed boolean;
    v_existing_id uuid;
    v_existing_hash text;
    v_email_conflict uuid;
BEGIN
    v_name := trim(coalesce(p_nome, ''));
    v_phone := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
    p_email := lower(trim(coalesce(p_email, '')));

    IF length(v_name) < 2 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Informe seu nome.');
    END IF;
    IF length(v_phone) < 10 OR length(v_phone) > 15 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;
    IF p_email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}$' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'E-mail inválido.');
    END IF;
    IF p_senha IS NULL OR length(p_senha) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'A senha precisa ter pelo menos 6 caracteres.');
    END IF;

    BEGIN
        SELECT public.check_rate_limit('criar_conta_cliente', 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    -- E-mail em uso por OUTRO telefone?
    SELECT id INTO v_email_conflict FROM public.clients
    WHERE lower(email) = p_email AND deleted_at IS NULL
      AND (phone IS NULL OR phone <> v_phone)
    LIMIT 1;
    IF v_email_conflict IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Este e-mail já está em uso por outra conta.');
    END IF;

    -- Cliente já existe pelo telefone? → vincula (herda histórico)
    SELECT id, name, password_hash INTO v_existing_id, v_name, v_existing_hash
    FROM public.clients WHERE phone = v_phone AND deleted_at IS NULL LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Segurança: se o telefone já tem senha, NÃO sobrescrever silenciosamente
        -- (evita que alguém que saiba o número tome a conta). Usa o fluxo de login
        -- ou de recuperação por e-mail.
        IF v_existing_hash IS NOT NULL THEN
            RETURN jsonb_build_object(
                'ok', false,
                'message', 'Este telefone já tem uma senha cadastrada. Entre com seu telefone e senha — ou use "Esqueci minha senha".'
            );
        END IF;
        UPDATE public.clients SET
            name = COALESCE(NULLIF(v_name, ''), name),
            email = CASE WHEN email IS NULL OR email = '' THEN p_email ELSE email END,
            password_hash = crypt(p_senha, gen_salt('bf', 10)),
            password_set_at = now()
        WHERE id = v_existing_id;
        RETURN jsonb_build_object('ok', true, 'client_id', v_existing_id, 'name', v_name, 'phone', v_phone, 'message', 'Conta vinculada ao seu histórico!');
    END IF;

    INSERT INTO public.clients (name, email, phone, password_hash, password_set_at)
    VALUES (v_name, p_email, v_phone, crypt(p_senha, gen_salt('bf', 10)), now())
    RETURNING id INTO v_client_id;

    RETURN jsonb_build_object('ok', true, 'client_id', v_client_id, 'name', v_name, 'phone', v_phone, 'message', 'Conta criada!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 4. redefinir_senha_cliente — valida o código e troca a senha (bcrypt)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION redefinir_senha_cliente(p_phone text, p_token text, p_nova_senha text)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
    v_token_hash text;
    v_allowed boolean;
BEGIN
    p_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    p_token := trim(coalesce(p_token, ''));

    IF length(p_phone) < 11 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;
    IF p_token !~ '^[0-9]{6}$' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Código inválido.');
    END IF;
    IF p_nova_senha IS NULL OR length(p_nova_senha) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'A senha precisa ter pelo menos 6 caracteres.');
    END IF;

    BEGIN
        SELECT public.check_rate_limit('redefinir_senha_cliente:' || p_phone, 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    SELECT id INTO v_client_id FROM public.clients
    WHERE phone = p_phone AND deleted_at IS NULL LIMIT 1;
    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

    IF NOT EXISTS (
        SELECT 1 FROM client_reset_tokens t
        WHERE t.client_id = v_client_id
          AND t.token_hash = v_token_hash
          AND t.used_at IS NULL
          AND t.expires_at > now()
    ) THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Código inválido ou expirado. Peça um novo.');
    END IF;

    UPDATE public.clients
    SET password_hash = crypt(p_nova_senha, gen_salt('bf', 10)), password_set_at = now()
    WHERE id = v_client_id;

    UPDATE client_reset_tokens SET used_at = now()
    WHERE client_id = v_client_id AND token_hash = v_token_hash AND used_at IS NULL;

    RETURN jsonb_build_object('ok', true, 'message', 'Senha redefinida!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 5. limpar_senha_cliente — admin reseta o acesso do cliente (fallback)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION limpar_senha_cliente(p_client_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_name text;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem redefinir senha de clientes';
    END IF;

    SELECT name INTO v_name FROM public.clients WHERE id = p_client_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    UPDATE public.clients SET password_hash = NULL, password_set_at = NULL WHERE id = p_client_id;

    RETURN jsonb_build_object('ok', true, 'name', v_name, 'message', 'Senha removida. O cliente entra sem senha e cria uma nova.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 6. atualizar_email_cliente + alterar_senha_cliente (dashboard do cliente)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION atualizar_email_cliente(p_phone text, p_email text)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
    v_allowed boolean;
    v_conflict uuid;
BEGIN
    p_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    p_email := lower(trim(coalesce(p_email, '')));

    IF length(p_phone) < 11 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;
    IF p_email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}$' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'E-mail inválido.');
    END IF;

    BEGIN
        SELECT public.check_rate_limit('atualizar_email:' || p_phone, 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    SELECT id INTO v_client_id FROM public.clients WHERE phone = p_phone AND deleted_at IS NULL LIMIT 1;
    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    SELECT id INTO v_conflict FROM public.clients
    WHERE lower(email) = p_email AND id <> v_client_id AND deleted_at IS NULL LIMIT 1;
    IF v_conflict IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Este e-mail já está em uso por outra conta.');
    END IF;

    UPDATE public.clients SET email = p_email WHERE id = v_client_id;
    RETURN jsonb_build_object('ok', true, 'email', p_email, 'message', 'E-mail atualizado!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION alterar_senha_cliente(p_phone text, p_senha_atual text, p_nova_senha text)
RETURNS jsonb AS $$
DECLARE
    v_client public.clients%ROWTYPE;
    v_allowed boolean;
BEGIN
    p_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

    IF length(p_phone) < 11 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;
    IF p_nova_senha IS NULL OR length(p_nova_senha) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'A nova senha precisa ter pelo menos 6 caracteres.');
    END IF;

    BEGIN
        SELECT public.check_rate_limit('alterar_senha:' || p_phone, 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    SELECT * INTO v_client FROM public.clients WHERE phone = p_phone AND deleted_at IS NULL LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    IF v_client.password_hash IS NULL OR v_client.password_hash <> crypt(coalesce(p_senha_atual, ''), v_client.password_hash) THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Senha atual incorreta.');
    END IF;

    UPDATE public.clients
    SET password_hash = crypt(p_nova_senha, gen_salt('bf', 10)), password_set_at = now()
    WHERE id = v_client.id;

    RETURN jsonb_build_object('ok', true, 'message', 'Senha alterada!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 7. Grants
-- ──────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION verificar_login_cliente(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION criar_conta_cliente(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION redefinir_senha_cliente(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION atualizar_email_cliente(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION alterar_senha_cliente(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION limpar_senha_cliente(uuid) TO authenticated;

-- >>> MIGRATION: 017_conta_cliente_email_dashboard.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 017 - E-MAIL NO DASHBOARD DO CLIENTE
-- =========================================================================
-- get_client_dashboard passa a incluir o e-mail do cliente no campo
-- stats.email (vazio se não cadastrado) — usado pelo /cliente para
-- preencher o card "Minha conta" (adicionar/alterar e-mail).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_client_dashboard(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_phone text := regexp_replace(p_phone, '\D', '', 'g');
  v_client_id uuid;
  v_stats jsonb;
  v_history jsonb;
BEGIN
  -- Rate limit por telefone (convenção do projeto)
  IF NOT check_rate_limit('client_dashboard:' || v_phone, 10, 60) THEN
    RAISE EXCEPTION 'Muitas tentativas. Aguarde 1 minuto e tente novamente.';
  END IF;

  IF v_phone !~ '^[0-9]{10,15}$' THEN
    RETURN jsonb_build_object('stats', NULL, 'history', '[]'::jsonb);
  END IF;

  SELECT id INTO v_client_id FROM clients WHERE phone = v_phone LIMIT 1;
  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('stats', NULL, 'history', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'historical_visits', COALESCE(historical_visits, 0),
    'historical_spent', COALESCE(historical_spent, 0),
    'last_visit_date', last_visit_date,
    'is_mensalista', is_mensalista,
    'mensalista_plan_id', mensalista_plan_id,
    'mensalista_expires_at', mensalista_expires_at,
    'email', COALESCE(email, '')
  ) INTO v_stats
  FROM clients WHERE id = v_client_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'booking_date', b.booking_date,
    'booking_time', b.booking_time,
    'status', b.status,
    'total_price', b.total_price,
    'total_duration', b.total_duration,
    'service_ids', b.service_ids
  ) ORDER BY b.booking_date DESC, b.booking_time DESC), '[]'::jsonb) INTO v_history
  FROM bookings b
  WHERE b.client_id = v_client_id
    AND b.status IN ('completed', 'cancelled')
  LIMIT 50;

  RETURN jsonb_build_object('stats', v_stats, 'history', v_history);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_dashboard(text) TO anon, authenticated;
