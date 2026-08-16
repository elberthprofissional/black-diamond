-- =========================================================================
-- BLACK DIAMOND - 003 AUDITORIA RLS
-- PERFORMANCE/AUDITORIA + RLS ESTRITO
-- =========================================================================
-- Consolidado de: 005_performance_auditoria.sql, 006_rls_estricto.sql
-- Unificado na consolidação 2026-08-15 — conteúdo preservado na ordem
-- original de execução (idempotente, CREATE OR REPLACE / IF NOT EXISTS).
-- =========================================================================

-- >>> MIGRATION: 005_performance_auditoria.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 005 - PERFORMANCE + AUDITORIA
-- =========================================================================
-- Consolidado de: 008_performance_indexes.sql, 009_fix_auditoria.sql
-- Índices de performance, view dashboard_daily_stats, get_dashboard_data e correções da auditoria v3.31.0.
-- =========================================================================


-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 008_performance_indexes.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 008 - PERFORMANCE INDEXES + CLEANUP
-- =========================================================================
-- Índices adicionados com base em auditoria de queries do frontend.
-- Rodar este arquivo no SQL Editor do Supabase após `db push`.
-- =========================================================================

-- BOOKINGS: queries combinadas por barbeiro + data
-- Usado por useBookings.ts (dashboard, agenda semanal, reagendar)
CREATE INDEX IF NOT EXISTS idx_bookings_barber_date
  ON bookings(barber_id, booking_date)
  WHERE status != 'cancelled';

-- BOOKINGS: índice composto para filtros do dashboard
-- Usado por useDashboardData e AdminWeekly
CREATE INDEX IF NOT EXISTS idx_bookings_date_status_barber
  ON bookings(booking_date, status, barber_id);

-- TESTIMONIALS: leitura pública ordenada
-- Usado por useTestimonials (slider da home)
CREATE INDEX IF NOT EXISTS idx_testimonials_active_sort
  ON testimonials(is_active, sort_order)
  WHERE is_active = true;

-- CLIENTS: índice no email para lookups futuros
CREATE INDEX IF NOT EXISTS idx_clients_email
  ON clients(email)
  WHERE email IS NOT NULL;

-- BOOKING_TOKENS: limpeza de tokens expirados
-- Usado por cron jobs futuros
CREATE INDEX IF NOT EXISTS idx_booking_tokens_expires_at
  ON booking_tokens(expires_at);

-- REMINDER_LOGS: índice composto para histórico recente (7 dias)
-- Usado por useReminders e loadRemindersFromDB
CREATE INDEX IF NOT EXISTS idx_reminder_logs_recent
  ON reminder_logs(sent_at DESC, client_id);

-- COUPONS: lookups por código são únicos mas vale ter índice ativo
CREATE INDEX IF NOT EXISTS idx_coupons_active_code
  ON coupons(is_active, code)
  WHERE is_active = true;

-- GALLERY_IMAGES: ordenação por position
CREATE INDEX IF NOT EXISTS idx_gallery_images_position
  ON gallery_images(position, created_at DESC);

-- =========================================================================
-- VIEW: dashboard_summary
-- Materializa contagens diárias para o dashboard (substitui N queries).
-- =========================================================================
CREATE OR REPLACE VIEW dashboard_daily_stats AS
SELECT
  booking_date,
  barber_id,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
  COUNT(*) FILTER (WHERE status = 'pending' OR status = 'confirmed') AS upcoming_count,
  COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0) AS revenue
FROM bookings
WHERE booking_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY booking_date, barber_id;

COMMENT ON VIEW dashboard_daily_stats IS
  'Contagens agregadas por dia+barbeiro dos últimos 90 dias. Otimiza AdminDashboard.';

-- =========================================================================
-- FUNÇÃO: bulk_cleanup_expired_tokens
-- Para ser chamada por cron job (pg_cron).
-- =========================================================================
CREATE OR REPLACE FUNCTION bulk_cleanup_expired_tokens()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM booking_tokens WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- FUNÇÃO: get_dashboard_data (server-side aggregation)
-- Substitui múltiplas queries do dashboard_admin por uma só chamada RPC.
-- =========================================================================
CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_barber_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'date', p_date,
    'total_clients', (
      SELECT COUNT(DISTINCT client_id)
      FROM bookings
      WHERE booking_date = p_date AND status IN ('pending', 'confirmed')
    ),
    'completed_today', (
      SELECT COUNT(*) FROM bookings
      WHERE booking_date = p_date AND status = 'completed'
    ),
    'cancelled_today', (
      SELECT COUNT(*) FROM bookings
      WHERE booking_date = p_date AND status = 'cancelled'
    ),
    'no_show_today', (
      SELECT COUNT(*) FROM bookings
      WHERE booking_date = p_date AND no_show = true
    ),
    'revenue_today', (
      SELECT COALESCE(SUM(total_price), 0) FROM bookings
      WHERE booking_date = p_date AND status = 'completed'
    ),
    'next_booking', (
      SELECT row_to_json(b) FROM (
        SELECT id, client_id, booking_time, total_price
        FROM bookings
        WHERE booking_date = p_date
          AND status IN ('pending', 'confirmed')
          AND booking_time >= CURRENT_TIME
        ORDER BY booking_time ASC
        LIMIT 1
      ) b
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_dashboard_data(uuid, date) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 009_fix_auditoria.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 009 - FIX: AUDITORIA v3.31.0
-- =========================================================================
-- Correções apontadas pela auditoria do projeto (Julho/2026).
-- Rodar este arquivo no SQL Editor do Supabase APÓS as migrations 001-008.
-- =========================================================================

-- =========================================================================
-- P2: Email do proprietário movido para settings (não hardcoded)
-- =========================================================================
-- Garante que a setting owner_email existe (criada em 006, mas por segurança)
INSERT INTO settings (key, value)
VALUES ('owner_email', 'elberthmayan2007@gmail.com')
ON CONFLICT (key) DO NOTHING;

-- =========================================================================
-- P3: p_discount_amount passado para criar_agendamento (validação server-side)
-- =========================================================================
-- Adiciona o parâmetro p_discount_amount à função criar_agendamento
-- para que o valor vindo do frontend seja validado contra o calculo server-side.
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

-- =========================================================================
-- P5: Remove wrapper duplicada com ordem invertida de parametros
-- =========================================================================
-- A funcao public.criar_agendamento_rate_limited(uuid, text, ...) com
-- parametros em ordem diferente causava ambiguidade na resolucao de
-- named parameters pelo Supabase RPC. O frontend ja chama a funcao
-- principal com named params, entao esta wrapper e desnecessaria.
DROP FUNCTION IF EXISTS public.criar_agendamento_rate_limited(uuid, text, text, text, uuid, date, numeric, integer, time, numeric, uuid[]);

-- =========================================================================
-- P6: Cron verificar-mensalistas - garante horario unico (08:00)
-- =========================================================================
-- Remove schedule duplicado e recria com horario padrao
SELECT cron.unschedule('verificar-mensalistas');
SELECT cron.schedule('verificar-mensalistas', '0 8 * * *', $$ SELECT verificar_mensalistas() $$);

-- =========================================================================
-- P11: Remove funcoes mortas (stubs de no-show)
-- =========================================================================
-- is_client_blocked_by_no_show e check_client_no_show_block foram
-- transformadas em stubs (sempre retornam false/no-op).
-- is_client_blocked_by_no_show: dropada (nenhum codigo a chama).
-- check_client_no_show_block: RECRIADA como no-op na migration 006,
-- pois criar_agendamento_rate_limited ainda a chama para clientes existentes
-- (sem ela: "function check_client_no_show_block(uuid) does not exist").
DROP FUNCTION IF EXISTS is_client_blocked_by_no_show(uuid);

-- =========================================================================
-- HISTORICO: Tabelas expenses e recurring_expenses
-- =========================================================================
-- Existiam no banco de producao (criadas manualmente no SQL Editor, sem
-- migration correspondente) e foram DROPADAS na limpeza de 2026-08-15
-- junto com barber_commissions, barber_schedules, barber_settings,
-- fixed_expenses, loyalty_config e system_settings (tabelas sem uso no app).
-- Backup em scripts/backup-tabelas-mortas.json.
-- =========================================================================

-- =========================================================================
-- P4 (parcial): Seeds de planos mensalistas
-- =========================================================================
-- Insere planos mensalistas padrao se a tabela estiver vazia
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM mensalista_plans) = 0 THEN
        INSERT INTO mensalista_plans (name, price, included_service_ids, is_active, is_default, sort_order)
        SELECT v.name, v.price::DECIMAL(10,2),
            COALESCE(ARRAY(SELECT id FROM services WHERE services.name = v.service_name), '{}'),
            true, true, v.sort_order
        FROM (VALUES
            ('Plano Black', 150.00, 'Corte de Cabelo', 1),
            ('Plano Gold', 120.00, 'Corte de Cabelo', 2)
        ) AS v(name, price, service_name, sort_order);
    END IF;
END $$;

-- =========================================================================
-- OTIMIZACAO: get_dashboard_data usando dashboard_daily_stats view
-- =========================================================================
-- Reimplementa get_dashboard_data usando a view criada em 008 para
-- substituir as 6 subqueries individuais por uma unica consulta.
CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_barber_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_stats RECORD;
BEGIN
  -- Usa a view dashboard_daily_stats (criada em 008) em vez de 6 subqueries
  SELECT * INTO v_stats
  FROM dashboard_daily_stats
  WHERE booking_date = p_date
    AND (p_barber_id IS NULL OR barber_id = p_barber_id);

  SELECT jsonb_build_object(
    'date', p_date,
    'completed_today', COALESCE(v_stats.completed_count, 0),
    'cancelled_today', COALESCE(v_stats.cancelled_count, 0),
    'revenue_today', COALESCE(v_stats.revenue, 0),
    'next_booking', (
      SELECT row_to_json(b) FROM (
        SELECT id, client_id, booking_time, total_price
        FROM bookings
        WHERE booking_date = p_date
          AND status IN ('pending', 'confirmed')
          AND booking_time >= CURRENT_TIME
          AND (p_barber_id IS NULL OR barber_id = p_barber_id)
        ORDER BY booking_time ASC
        LIMIT 1
      ) b
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_dashboard_data(uuid, date) TO authenticated;

-- =========================================================================
-- FIM: 009_fix_auditoria.sql
-- =========================================================================

-- >>> MIGRATION: 006_rls_estricto.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 006 - RLS ESTRITO + RPCS PÚBLICAS SEGURAS
-- =========================================================================
-- Correção de segurança encontrada na auditoria de 2026-08-05:
--   🚨 A chave anon (pública) conseguia LER todos os clientes
--      (nome, telefone, e-mail, notas) — vazamento de dados pessoais.
--   🚨 A chave anon conseguia ESCREVER em clients (INSERT/UPDATE/DELETE).
--   🚨 A chave anon conseguia criar bookings direto na tabela,
--      pulando a RPC criar_agendamento (validação de horário, cupom,
--      mensalista e rate limiting).
--
-- O que este migration faz:
--   1. Remove policies RLS permissivas órfãs em clients e bookings
--      (mantém apenas as policies oficiais da migration 001).
--   2. Habilita RLS em clients e bookings.
--   3. Recria as policies oficiais:
--        - clients  → apenas admin (authenticated + is_admin())
--        - bookings → admin full + leitura pública filtrada por status/data
--   4. Cria a RPC pública SEGURA cadastrar_cliente_publico()
--      (upsert idempotente por telefone) — substitui o INSERT direto
--      que o frontend fazia no fluxo "Sou novo aqui".
--   5. Cria a RPC pública SEGURA get_client_dashboard()
--      (stats + histórico do cliente via SECURITY DEFINER) — substitui as
--      leituras diretas da página /cliente.
--
-- ⚠️  Execute TUDO no SQL Editor do Supabase (em ordem).
--     Depois valide com: node scripts/audit-rls.mjs
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. REMOVER POLICIES PERMISSIVAS ÓRFÃS (clients e bookings)
--    Mantém apenas as policies oficiais declaradas na migration 001.
-- ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname
           FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename IN ('clients', 'bookings')
  LOOP
    IF p.policyname::text NOT IN (
      'Clientes gerenciamento admin',
      'Agendamentos gerenciamento admin',
      'Leitura publica agendamentos'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    END IF;
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────────────
-- 2. HABILITAR RLS (idempotente)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────
-- 3. POLICIES OFICIAIS — CLIENTS (apenas admin)
-- ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clientes gerenciamento admin" ON public.clients;
CREATE POLICY "Clientes gerenciamento admin" ON public.clients
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- 4. POLICIES OFICIAIS — BOOKINGS (admin full + leitura pública)
-- ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Agendamentos gerenciamento admin" ON public.bookings;
CREATE POLICY "Agendamentos gerenciamento admin" ON public.bookings
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Leitura publica agendamentos" ON public.bookings;
CREATE POLICY "Leitura publica agendamentos" ON public.bookings
FOR SELECT
USING (
  (status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE)
  OR status = 'completed'
);

-- ──────────────────────────────────────────────────────────────────────
-- 5. RPC PÚBLICA: cadastrar_cliente_publico (upsert idempotente)
--    SECURITY DEFINER → roda como dono da tabela, sem expor a tabela.
--    Substitui o INSERT direto do BookingPreScreen ("Sou novo aqui").
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
  -- Rate limit por IP (convenção do projeto: RPCs públicas de telefone usam check_rate_limit)
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
-- 6. RPC PÚBLICA: get_client_dashboard (stats + histórico)
--    SECURITY DEFINER → só retorna os dados do telefone informado,
--    sem nunca expor a tabela clients inteira.
--    Substitui as leituras diretas do ClientProfile (/cliente).
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
-- 7. FIX: check_client_no_show_block (recreada como no-op)
--    A migration 005 dropou esta funcao, mas criar_agendamento_rate_limited
--    (002/004) ainda a chama para clientes existentes — causando o erro:
--      "function check_client_no_show_block(uuid) does not exist"
--    Como o bloqueio automatico por faltas foi DESATIVADO (v3.31 — so notifica),
--    a funcao e recriada como no-op. is_client_blocked_by_no_show permanece
--    removida (nenhum codigo a chama mais).
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_client_no_show_block(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- No-op intencional: bloqueio automatico por faltas desativado (v3.31+).
    -- O limite de faltas (settings.max_no_shows) so gera notificacao.
    RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_client_no_show_block(uuid) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 8. VALIDAÇÃO MANUAL (opcional — rode no SQL Editor para conferir):
--
--    SET ROLE anon;
--    SELECT count(*) FROM clients;   -- deve ser 0 (anon perdeu leitura)
--    SELECT count(*) FROM bookings;  -- apenas públicos (design)
--    SELECT public.cadastrar_cliente_publico('Teste', '31999999999'); -- upsert ok
--    SELECT public.get_client_dashboard('31999999999');              -- ok
--    RESET ROLE;
-- ──────────────────────────────────────────────────────────────────────
