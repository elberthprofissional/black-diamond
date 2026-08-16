-- =========================================================================
-- BLACK DIAMOND - 004 ESCOPO BARBEIRO ACESSO
-- ESCOPO POR BARBEIRO + ACESSO PÚBLICO SEGURO
-- =========================================================================
-- Consolidado de: 011_barber_scope_rls.sql, 012_secure_bookings_public_access.sql, 013_barber_availability_fix.sql
-- Unificado na consolidação 2026-08-15 — conteúdo preservado na ordem
-- original de execução (idempotente, CREATE OR REPLACE / IF NOT EXISTS).
-- =========================================================================

-- >>> MIGRATION: 011_barber_scope_rls.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 011 - ESCONTE POR BARBEIRO (RLS MULTI-BARBEIRO)
-- =========================================================================
-- Contexto: a v3.36 traz de volta o multi-barbeiro (cliente escolhe o
-- barbeiro; cada barbeiro tem login próprio). A policy "Agendamentos
-- gerenciamento admin" (001/006) dava leitura/escrita TOTAL a qualquer
-- admin autenticado — o filtro por barbeiro do frontend era só cosmético.
--
-- Esta migration transforma o escopo em regra de banco:
--   • DONO (barbers.is_owner = true — ex.: Tato)  → vê e gerencia TUDO
--   • BARBEIRO COMUM (barbers.user_id = auth.uid()) → vê/gerencia apenas os
--     agendamentos com barber_id = o dele
--   • Admin SEM vínculo na tabela barbers → não vê NADA de bookings
--     (fail-closed; evita "admin fantasma" lendo tudo silenciosamente)
--
-- A leitura pública do site (anon) NÃO muda — continua pela policy
-- "Leitura publica agendamentos" (status/data).
--
-- ⚠️ Atualização (migration 008): a policy "Leitura publica agendamentos"
--    foi REMOVIDA — consultas públicas de bookings agora passam 100% por
--    RPCs SECURITY DEFINER (get_occupied_slots, get_client_dashboard, etc.).
--
-- ⚠️  Execute no SQL Editor do Supabase (depois das migrations 001-006).
--     Reversão: rodar o bloco comentado no final deste arquivo.
--     Valide com: node scripts/audit-rls.mjs
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. FUNÇÕES AUXILIARES
-- ──────────────────────────────────────────────────────────────────────
-- O admin logado é dono? (é o barbeiro chefe — vê tudo)
CREATE OR REPLACE FUNCTION public.is_barber_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbers
    WHERE user_id = auth.uid() AND is_owner = true
  );
$$;

-- ID do barbeiro vinculado ao usuário logado (null se não vinculado)
CREATE OR REPLACE FUNCTION public.current_barber_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_barber_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_barber_id() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 2. SUBSTITUIR A POLICY ADMIN DE BOOKINGS PELO ESCOPO POR BARBEIRO
--    (a antiga "Agendamentos gerenciamento admin" dava tudo a todo admin)
-- ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Agendamentos gerenciamento admin" ON public.bookings;

-- Leitura: dono vê tudo; barbeiro comum vê só os próprios
CREATE POLICY "Agendamentos leitura por barbeiro" ON public.bookings
FOR SELECT TO authenticated
USING (
  is_admin()
  AND (is_barber_owner() OR barber_id = current_barber_id())
);

-- Inserção: dono agenda para qualquer barbeiro; barbeiro comum só para si
CREATE POLICY "Agendamentos criacao admin" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
  is_admin()
  AND (is_barber_owner() OR barber_id = current_barber_id())
);

-- Atualização (ex.: status, reagendamento): escopo igual ao SELECT
CREATE POLICY "Agendamentos edicao admin" ON public.bookings
FOR UPDATE TO authenticated
USING (
  is_admin()
  AND (is_barber_owner() OR barber_id = current_barber_id())
)
WITH CHECK (
  is_admin()
  AND (is_barber_owner() OR barber_id = current_barber_id())
);

-- Exclusão: escopo igual ao SELECT
CREATE POLICY "Agendamentos exclusao admin" ON public.bookings
FOR DELETE TO authenticated
USING (
  is_admin()
  AND (is_barber_owner() OR barber_id = current_barber_id())
);

-- ──────────────────────────────────────────────────────────────────────
-- 3. VALIDAÇÃO MANUAL (opcional — rode no SQL Editor para conferir):
--
--    -- Como um barbeiro comum (troque pelo user_id real do novo barbeiro):
--    SET LOCAL ROLE authenticated;
--    SET LOCAL request.jwt.claims = '{"sub":"<user_id-do-barbeiro>"}';
--    SELECT count(*) FROM bookings;  -- só os agendamentos DELE
--    RESET ROLE;
--
-- ──────────────────────────────────────────────────────────────────────
-- REVERSÃO (se precisar voltar ao comportamento antigo):
--
--   DROP POLICY IF EXISTS "Agendamentos leitura por barbeiro" ON public.bookings;
--   DROP POLICY IF EXISTS "Agendamentos criacao admin" ON public.bookings;
--   DROP POLICY IF EXISTS "Agendamentos edicao admin" ON public.bookings;
--   DROP POLICY IF EXISTS "Agendamentos exclusao admin" ON public.bookings;
--   CREATE POLICY "Agendamentos gerenciamento admin" ON public.bookings
--   FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
-- ──────────────────────────────────────────────────────────────────────

-- >>> MIGRATION: 012_secure_bookings_public_access.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 012 - HARDENING DE ACESSO PÚBLICO (BOOKINGS + IS_ADMIN)
-- =========================================================================
-- Achados da auditoria 360 (2026-08-06):
--
--   🚨 1. A policy "Leitura publica agendamentos" (001/006) permitia que a
--          chave anon (pública) fizesse SELECT em TODAS as colunas de
--          bookings — incluindo `notes`, `total_price`, `discount_amount`,
--          `client_id`, `coupon_id` — de TODOS os clientes, tanto no
--          histórico completo (`status = 'completed'`) quanto nos
--          agendamentos futuros. Qualquer pessoa com a chave anon montava
--          o histórico financeiro inteiro da barbearia.
--
--          A leitura pública que o SITE precisa hoje é 100% coberta por
--          RPCs SECURITY DEFINER (que validam, filtram e aplicam rate limit):
--            - get_available_slots / get_occupied_slots → página de agendamento
--            - get_bookings_by_token / cancel_booking_public → gerenciar/cancelar
--            - get_bookings_by_phone_rate_limited / get_last_booking_by_phone_rate_limited
--            - get_client_dashboard → painel do cliente (/cliente)
--          Nenhuma parte pública do app faz SELECT direto na tabela bookings
--          (verificado na auditoria: 0 referências públicas).
--
--          Solução: REMOVER a policy pública. O admin continua com acesso
--          total via as policies "Agendamentos ..." da migration 007
--          (escopo por barbeiro) e a tabela deixa de ser legível por anon
--          (inclusive via Realtime).
--
--   🚨 2. O AuthGuard do frontend só verificava existência de sessão —
--          qualquer usuário autenticado (mesmo não-admin) conseguia abrir
--          as telas admin. A função is_admin() (001) é SECURITY DEFINER,
--          mas sem GRANT EXECUTE explícito alguns projetos Supabase
--          revogam o EXECUTE padrão de PUBLIC, impossibilitando o
--          frontend de validar. Aqui garantimos o GRANT para que o
--          AuthGuard possa rejeitar não-admins.
--
--  ⚠️  Ordem: rodar DEPOIS das migrations 001-007.
--      Reversão da policy: recriar
--        CREATE POLICY "Leitura publica agendamentos" ON public.bookings
--        FOR SELECT USING (
--          (status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE)
--          OR status = 'completed'
--        );
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. REMOVER A POLICY PÚBLICA DE LEITURA DE BOOKINGS
-- ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Leitura publica agendamentos" ON public.bookings;

-- ──────────────────────────────────────────────────────────────────────
-- 2. GARANTIR QUE is_admin() SEJA CHAMÁVEL PELO FRONTEND AUTENTICADO
--    (usada pelo AuthGuard para validar acesso às telas admin)
-- ──────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 3. VALIDAÇÃO MANUAL (opcional — rode no SQL Editor para conferir):
--
--    SET ROLE anon;
--    SELECT count(*) FROM bookings;    -- deve falhar (permission denied)
--    SELECT * FROM get_occupied_slots(CURRENT_DATE); -- ok (RPC pública)
--    RESET ROLE;
--
--    Depois valide com: node scripts/audit-rls.mjs
-- ──────────────────────────────────────────────────────────────────────

-- >>> MIGRATION: 013_barber_availability_fix.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 013 - DISPONIBILIDADE POR BARBEIRO (FIX MULTI-BARBEIRO)
-- =========================================================================
-- Contexto: com o multi-barbeiro, cada barbeiro tem os PRÓPRIOS horários
-- disponíveis (o Tato ocupado às 14h NÃO bloqueia o Juninho às 14h).
--
-- Problema encontrado:
--   1. get_available_slots / get_occupied_slots: quando consultados por um
--      barbeiro específico (p_barber_id), os bookings com barber_id NULL
--      (bloqueios de horário, almoço, agendamentos legados) NÃO eram
--      considerados → um horário bloqueado aparecia como LIVRE.
--   2. criar_agendamento: dependia apenas do unique index parcial
--      (date, time, barber_id) — bookings com barber_id NULL não conflitavam
--      com barbeiros específicos, permitindo agendar em cima de bloqueio.
--
-- Correção: bookings globais (barber_id IS NULL) bloqueiam TODOS os barbeiros;
-- bookings de um barbeiro bloqueiam apenas ele.
-- =========================================================================


-- ──────────────────────────────────────────────────────────────────────
-- 1. get_available_slots — bloqueios globais bloqueiam todos os barbeiros
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
-- 2. get_occupied_slots — mesma correção
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_occupied_slots(p_date date, p_barber_id uuid DEFAULT NULL)
RETURNS TABLE(booking_time time, status text) AS $$
BEGIN
    RETURN QUERY SELECT b.booking_time, b.status
    FROM bookings b
    WHERE b.booking_date = p_date
    AND b.status != 'cancelled'
    AND (
        p_barber_id IS NOT NULL AND (b.barber_id = p_barber_id OR b.barber_id IS NULL)
        OR p_barber_id IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 3. criar_agendamento — validação explícita de conflito por barbeiro
-- ──────────────────────────────────────────────────────────────────────
-- Dropar versões antigas para permitir CREATE OR REPLACE limpo.
DROP FUNCTION IF EXISTS criar_agendamento(text, text, uuid[], date, time without time zone, numeric, integer, text);
DROP FUNCTION IF EXISTS criar_agendamento(text, text, uuid[], date, time without time zone, numeric, integer, text, uuid);

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

-- Garante que a versão com rate limiting continua chamando a função correta
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time without time zone, numeric, integer, text, uuid, numeric, uuid);

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

GRANT EXECUTE ON FUNCTION criar_agendamento(text, text, uuid[], date, time without time zone, numeric, integer, text, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION criar_agendamento_rate_limited(text, text, uuid[], date, time without time zone, numeric, integer, text, uuid, numeric, uuid) TO anon, authenticated;
