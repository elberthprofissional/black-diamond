-- =========================================================================
-- Migration: Multi-Barbeiro v1.0
-- =========================================================================
-- Adiciona suporte a múltiplos barbeiros no sistema.
--
-- O que muda:
--   1. Nova tabela barbers (CRUD de barbeiros)
--   2. Nova tabela barber_commissions (histórico de comissões)
--   3. Coluna barber_id adicionada em bookings
--   4. RPCs para filtrar por barbeiro
--   5. Função criar_agendamento atualizada para aceitar barber_id
-- =========================================================================

-- =========================================================================
-- 1. TABELA: barbers
-- =========================================================================
CREATE TABLE IF NOT EXISTS barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    photo_url TEXT,
    commission DECIMAL(5,2) DEFAULT 0,
    working_days JSONB DEFAULT '{"0":false,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 2. TABELA: barber_commissions (histórico de comissões)
-- =========================================================================
CREATE TABLE IF NOT EXISTS barber_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 3. ADICIONAR barber_id EM bookings
-- =========================================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL;

-- Índice para consultas por barbeiro
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_barber ON bookings(booking_date, barber_id) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_barber_commissions_barber ON barber_commissions(barber_id);

-- =========================================================================
-- 4. ATUALIZAR unique index de double booking para incluir barber_id
-- =========================================================================
-- O antiguo índice impedia 2 agendamentos no mesmo horário.
-- Agora precisamos permitir que barbeiros diferentes tenham o mesmo horário.
DROP INDEX IF EXISTS idx_no_double_booking;
CREATE UNIQUE INDEX idx_no_double_booking
ON bookings (booking_date, booking_time, COALESCE(barber_id, '00000000-0000-0000-0000-000000000000'))
WHERE (status != 'cancelled' AND is_blocked = FALSE);

-- =========================================================================
-- 5. ATUALIZAR criar_agendamento para aceitar p_barber_id
-- =========================================================================
CREATE OR REPLACE FUNCTION criar_agendamento(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time,
    p_preco_total decimal,
    p_duracao_total integer,
    p_cliente_email text DEFAULT NULL,
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
    v_server_price decimal;
    v_server_duration integer;
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
    v_total_calculated_price decimal := 0;

    -- Comissão
    v_barber_commission DECIMAL(5,2) := 0;
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

            SELECT COALESCE(SUM(duration), 0) INTO v_server_duration
            FROM services WHERE id = ANY(p_servicos);

            v_service_ends_at := p_hora + (v_server_duration || ' minutes')::interval;

            IF v_day_of_week = ANY(v_lunch_days)
               AND p_hora < v_lunch_start
               AND v_service_ends_at > v_lunch_start THEN
                RAISE EXCEPTION 'Seu serviço terminaria durante o horário de almoço (%). Escolha um horário mais cedo ou um serviço mais curto.', v_lunch_start;
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
    FROM clients
    WHERE id = v_client_id;

    IF v_is_mensalista = TRUE AND (v_expires_at IS NULL OR v_expires_at >= NOW()) AND v_plan_id IS NOT NULL THEN
        SELECT included_service_ids INTO v_plan_services 
        FROM mensalista_plans 
        WHERE id = v_plan_id AND is_active = TRUE;
    END IF;

    -- CÁLCULO DE VALOR E DURAÇÃO NO SERVIDOR
    v_total_calculated_price := 0;

    FOREACH v_service_id IN ARRAY p_servicos
    LOOP
        SELECT price INTO v_service_price
        FROM services WHERE id = v_service_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Serviço inválido.';
        END IF;

        IF v_is_mensalista = TRUE AND v_plan_services IS NOT NULL AND (v_service_id = ANY(v_plan_services)) THEN
            v_service_price := 0;
        END IF;

        v_total_calculated_price := v_total_calculated_price + v_service_price;
    END LOOP;

    SELECT COALESCE(SUM(duration), 0) INTO v_server_duration
    FROM services WHERE id = ANY(p_servicos);

    p_preco_total := v_total_calculated_price;
    p_duracao_total := v_server_duration;

    -- PEGAR COMISSÃO DO BARBEIRO (se selecionado)
    IF p_barber_id IS NOT NULL THEN
        SELECT commission INTO v_barber_commission
        FROM barbers WHERE id = p_barber_id AND is_active = TRUE;
    END IF;

    -- CRIA O AGENDAMENTO (AGORA COM barber_id)
    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, barber_id)
    VALUES (v_client_id, p_servicos, p_data, p_hora, p_preco_total, p_duracao_total, 'confirmed', p_barber_id)
    RETURNING id INTO v_booking_id;

    -- REGISTRA COMISSÃO SE HOUVER BARBEIRO
    IF p_barber_id IS NOT NULL AND v_barber_commission > 0 THEN
        INSERT INTO barber_commissions (barber_id, booking_id, amount, commission_rate)
        VALUES (p_barber_id, v_booking_id, (p_preco_total * v_barber_commission / 100), v_barber_commission);
    END IF;

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

-- =========================================================================
-- 6. ATUALIZAR criar_agendamento_rate_limited
-- =========================================================================
CREATE OR REPLACE FUNCTION criar_agendamento_rate_limited(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time,
    p_preco_total decimal,
    p_duracao_total integer,
    p_cliente_email text DEFAULT NULL,
    p_barber_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
BEGIN
    IF NOT check_rate_limit('criar_agendamento', 3, 60) THEN
        RAISE EXCEPTION 'Muitas tentativas. Aguarde 1 minuto e tente novamente.';
    END IF;

    RETURN criar_agendamento(
        p_cliente_nome, p_cliente_telefone, p_servicos,
        p_data, p_hora, p_preco_total, p_duracao_total,
        p_cliente_email, p_barber_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 7. RPC: Buscar barbeiros ativos (público)
-- =========================================================================
CREATE OR REPLACE FUNCTION get_active_barbers()
RETURNS TABLE(
    id UUID,
    name TEXT,
    photo_url TEXT,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.name, b.photo_url, b.sort_order
    FROM barbers b
    WHERE b.is_active = TRUE
    ORDER BY b.sort_order ASC, b.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 8. RPC: Buscar todos os barbeiros (admin)
-- =========================================================================
CREATE OR REPLACE FUNCTION get_all_barbers()
RETURNS TABLE(
    id UUID,
    name TEXT,
    phone TEXT,
    photo_url TEXT,
    commission DECIMAL(5,2),
    working_days JSONB,
    is_active BOOLEAN,
    sort_order INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem listar todos os barbeiros.';
    END IF;

    RETURN QUERY
    SELECT b.id, b.name, b.phone, b.photo_url, b.commission,
           b.working_days, b.is_active, b.sort_order, b.created_at
    FROM barbers b
    ORDER BY b.sort_order ASC, b.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 9. RPC: Buscar agendamentos por barbeiro
-- =========================================================================
CREATE OR REPLACE FUNCTION get_bookings_by_barber(
    p_barber_id UUID,
    p_date DATE
)
RETURNS TABLE(
    id UUID,
    client_name TEXT,
    client_phone TEXT,
    service_ids UUID[],
    booking_time TIME,
    total_price DECIMAL,
    total_duration INTEGER,
    status TEXT,
    is_blocked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        c.name,
        c.phone,
        b.service_ids,
        b.booking_time,
        b.total_price,
        b.total_duration,
        b.status,
        b.is_blocked
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    WHERE b.barber_id = p_barber_id
    AND b.booking_date = p_date
    AND b.status != 'cancelled'
    ORDER BY b.booking_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 10. RPC: Estatísticas de comissão por barbeiro
-- =========================================================================
CREATE OR REPLACE FUNCTION get_barber_stats(
    p_barber_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_bookings BIGINT,
    total_revenue DECIMAL,
    total_commission DECIMAL,
    completed_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COALESCE(SUM(b.total_price), 0),
        COALESCE(SUM(bc.amount), 0),
        COUNT(*) FILTER (WHERE b.status = 'completed')::BIGINT
    FROM bookings b
    LEFT JOIN barber_commissions bc ON bc.booking_id = b.id AND bc.barber_id = p_barber_id
    WHERE b.barber_id = p_barber_id
    AND b.booking_date BETWEEN p_start_date AND p_end_date
    AND b.status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 11. RLS para barbers (admin gerencia, público leitura ativos)
-- =========================================================================
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_commissions ENABLE ROW LEVEL SECURITY;

-- Barbers: admin pode tudo, anônimo só lê ativos
DROP POLICY IF EXISTS "Barbers admin full access" ON barbers;
CREATE POLICY "Barbers admin full access" ON barbers
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Barbers public read active" ON barbers;
CREATE POLICY "Barbers public read active" ON barbers
    FOR SELECT TO anon
    USING (is_active = TRUE);

-- Barber commissions: apenas admin
DROP POLICY IF EXISTS "Barber commissions admin" ON barber_commissions;
CREATE POLICY "Barber commissions admin" ON barber_commissions
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =========================================================================
-- ✅ MIGRAÇÃO CONCLUÍDA
-- =========================================================================
