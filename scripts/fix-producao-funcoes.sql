-- =========================================================================
-- FIX PRODUÇÃO (2026-08-06) — FUNÇÕES DESATUALIZADAS / OMISSAS
-- =========================================================================
-- Diagnóstico feito com a chave do projeto (testes reais em produção):
--
--   ✅ JÁ FUNCIONA: criar_agendamento + criar_agendamento_rate_limited com
--      a assinatura NOVA (com p_barber_id) — agendamento real criado com
--      sucesso via chave anon (exatamente como o app faz).
--
--   ❌ AINDA FALTAM no banco (quebram o app):
--        - check_client_no_show_block(uuid)      → cliente existente quebra
--        - get_client_dashboard(text)            → painel /cliente quebra
--        - get_client_milestones_public(uuid)    → fidelidade quebra
--        - cadastrar_cliente_publico(text, text) → fluxo "Sou novo aqui"
--
-- ⚠️  Este script é IDEMPOTENTE e seguro: recria as funções com as
--    assinaturas atuais, aplica grants, e NÃO mexe em nenhum dado
--    (settings, clients, bookings intactos).
--    COLE TUDO no SQL Editor do Supabase e execute em ordem.
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. REMOVER OVERLOADS ANTIGAS (todas as variações conhecidas)
-- ──────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.criar_agendamento(text, text, uuid[], date, time, numeric, integer, text);
DROP FUNCTION IF EXISTS public.criar_agendamento(text, text, uuid[], date, time, numeric, integer, text, uuid);
DROP FUNCTION IF EXISTS public.criar_agendamento(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric);
DROP FUNCTION IF EXISTS public.criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text);
DROP FUNCTION IF EXISTS public.criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric);
DROP FUNCTION IF EXISTS public.criar_agendamento_rate_limited(uuid, text, text, text, uuid, date, numeric, integer, time, numeric, uuid[]);

-- ──────────────────────────────────────────────────────────────────────
-- 2. criar_agendamento (VERSÃO ATUAL — migration 002, com p_barber_id)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.criar_agendamento(
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

GRANT EXECUTE ON FUNCTION public.criar_agendamento(text, text, uuid[], date, time, numeric, integer, text, uuid, uuid) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 3. criar_agendamento_rate_limited (VERSÃO ATUAL — 002/004)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.criar_agendamento_rate_limited(
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

GRANT EXECUTE ON FUNCTION public.criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric, uuid) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 4. check_client_no_show_block (no-op — migration 006)
--    Necessária: o criar_agendamento_rate_limited novo chama esta função.
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_client_no_show_block(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- No-op intencional: bloqueio automatico por faltas desativado (v3.31+).
    RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_client_no_show_block(uuid) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 5. cadastrar_cliente_publico (migration 006 — fluxo "Sou novo aqui")
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cadastrar_cliente_publico(
  p_nome text,
  p_telefone text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
  v_nome text := TRIM(p_nome);
  v_phone text := regexp_replace(p_telefone, '\D', '', 'g');
BEGIN
  IF NOT check_rate_limit('cadastrar_cliente', 5, 60) THEN
    RAISE EXCEPTION 'Muitas tentativas. Aguarde 1 minuto e tente novamente.';
  END IF;

  IF v_nome = '' OR length(v_nome) < 2 THEN
    RAISE EXCEPTION 'Nome do cliente invalido (minimo de 2 caracteres).';
  END IF;
  IF v_phone !~ '^[0-9]{10,15}$' THEN
    RAISE EXCEPTION 'Numero de telefone invalido (deve conter apenas numeros e ter entre 10 e 15 digitos).';
  END IF;

  SELECT id INTO v_client_id FROM clients WHERE phone = v_phone LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (name, phone)
    VALUES (v_nome, v_phone)
    RETURNING id INTO v_client_id;
  END IF;

  RETURN jsonb_build_object('id', v_client_id, 'name', v_nome, 'phone', v_phone);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cadastrar_cliente_publico(text, text) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 6. get_client_dashboard (migration 006 — painel do cliente /cliente)
-- ──────────────────────────────────────────────────────────────────────
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
    'mensalista_expires_at', mensalista_expires_at
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

-- ──────────────────────────────────────────────────────────────────────
-- 7. get_client_milestones_public (migration 002 — fidelidade no booking)
--    Grant restaurado: o frontend público (v3.35+) chama esta RPC.
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_client_milestones_public(p_client_id UUID)
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

GRANT EXECUTE ON FUNCTION public.get_client_milestones_public(uuid) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 8. GRANT extra: is_admin() para o AuthGuard do frontend (deploy futuro)
-- ──────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 9. VALIDAÇÃO (rode depois e confira que responde sem "does not exist"):
--    SELECT public.get_client_dashboard('31999999999');
--    SELECT public.cadastrar_cliente_publico('Teste Fix', '31988887777');  -- upsert
--    SELECT public.get_available_slots('2026-08-07');
-- ──────────────────────────────────────────────────────────────────────
