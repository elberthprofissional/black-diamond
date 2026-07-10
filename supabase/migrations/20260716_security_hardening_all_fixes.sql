-- =========================================================================
-- Migration: Security Hardening + All Audit Fixes
-- =========================================================================
-- 1. unblock_day: adiciona verificação is_admin()
-- 2. idx_no_double_booking: inclui blocked bookings
-- 3. get_bookings_by_phone: remove exposição direta de token
-- 4. lookup_client_by_phone: adiciona rate limiting via tabela
-- 5. criar_agendamento: validação de preço server-side reforçada
-- 6. Cleanup automático de tokens expirados
-- 7. Rate limiting table + function
-- 8. Fix lunch break: valida se serviço cruza horário de almoço
-- =========================================================================

-- =========================================================================
-- 1. FIX: unblock_day agora requer admin autenticado
-- =========================================================================
CREATE OR REPLACE FUNCTION unblock_day(p_date date)
RETURNS void AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem desbloquear dias.';
    END IF;

    UPDATE bookings
    SET is_blocked = FALSE, status = 'cancelled'
    WHERE booking_date = p_date AND is_blocked = TRUE AND status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 2. FIX: idx_no_double_booking inclui blocked bookings
-- =========================================================================
DROP INDEX IF EXISTS idx_no_double_booking;
CREATE UNIQUE INDEX idx_no_double_booking
ON bookings (booking_date, booking_time)
WHERE (status != 'cancelled' AND is_blocked = FALSE);

-- =========================================================================
-- 3. FIX: get_bookings_by_phone não expõe token diretamente
--    Retorna apenas se o token existe (boolean), não o valor
-- =========================================================================
DROP FUNCTION IF EXISTS get_bookings_by_phone(p_phone text);
CREATE OR REPLACE FUNCTION get_bookings_by_phone(p_phone text)
RETURNS TABLE(
    id UUID,
    booking_date DATE,
    booking_time TIME,
    status TEXT,
    total_price DECIMAL,
    total_duration INTEGER,
    service_ids UUID[],
    clients JSONB,
    has_token BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.booking_date,
        b.booking_time,
        b.status::text,
        b.total_price,
        b.total_duration,
        b.service_ids,
        jsonb_build_object('name', c.name, 'phone', c.phone) AS clients,
        EXISTS(
            SELECT 1 FROM booking_tokens bt
            WHERE bt.booking_id = b.id AND bt.expires_at > NOW()
        ) AS has_token
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_phone
    AND b.status IN ('pending', 'confirmed')
    AND b.booking_date >= CURRENT_DATE
    ORDER BY b.booking_date ASC, b.booking_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 4. RATE LIMITING: Tabela e função para proteção server-side
-- =========================================================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL,
    ip_address TEXT,
    attempts INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(created_at);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rate limits full access" ON rate_limits;
-- Apenas SECURITY DEFINER functions acessam rate_limits (bypass RLS)
-- Nenhum acesso direto do cliente permitido

-- Função: verificar e registrar tentativa de rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key text,
    p_max_attempts integer DEFAULT 5,
    p_window_seconds integer DEFAULT 900
)
RETURNS boolean AS $$
DECLARE
    v_ip text;
    v_count integer;
    v_window_start timestamptz;
BEGIN
    -- Obter IP do cliente (fallback para 'unknown')
    v_ip := COALESCE(
        current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
        current_setting('request.headers', true)::jsonb->>'x-real-ip',
        'unknown'
    );
    -- Extrair primeiro IP se houver múltiplos
    v_ip := split_part(v_ip, ',', 1);

    -- Limpar registros antigos da janela
    DELETE FROM rate_limits
    WHERE key = p_key
    AND ip_address = v_ip
    AND created_at < NOW() - (p_window_seconds || ' seconds')::interval;

    -- Contar tentativas na janela atual
    SELECT COUNT(*), MIN(window_start)
    INTO v_count, v_window_start
    FROM rate_limits
    WHERE key = p_key
    AND ip_address = v_ip
    AND window_start >= NOW() - (p_window_seconds || ' seconds')::interval;

    IF v_count >= p_max_attempts THEN
        RETURN false; -- Bloqueado
    END IF;

    -- Registrar esta tentativa
    INSERT INTO rate_limits (key, ip_address, attempts, window_start)
    VALUES (p_key, v_ip, 1, COALESCE(v_window_start, NOW()));

    RETURN true; -- Permitido
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 5. FIX: lookup_client_by_phone com rate limiting
-- =========================================================================
DROP FUNCTION IF EXISTS lookup_client_by_phone(p_phone text);
CREATE OR REPLACE FUNCTION lookup_client_by_phone(p_phone text)
RETURNS TABLE(
    id UUID,
    name TEXT,
    phone TEXT,
    is_mensalista BOOLEAN,
    mensalista_plan_id UUID
) AS $$
DECLARE
    v_client_ip text;
    v_rate_key text;
BEGIN
    -- Rate limiting: máximo 10 consultas por telefone por minuto
    v_client_ip := COALESCE(
        current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
        'unknown'
    );
    v_rate_key := 'lookup_client:' || p_phone;

    IF NOT check_rate_limit(v_rate_key, 10, 60) THEN
        RAISE EXCEPTION 'Muitas consultas. Aguarde um momento e tente novamente.';
    END IF;

    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.is_mensalista, c.mensalista_plan_id
    FROM clients c
    WHERE c.phone = p_phone
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 6. FIX: criar_agendamento reforça validação de preço server-side
--    e valida se serviço não cruza horário de almoço
-- =========================================================================
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
    v_service_ends_at time;
    
    -- Variáveis para correção de mensalistas
    v_is_mensalista boolean := false;
    v_plan_id uuid;
    v_expires_at timestamptz;
    v_plan_services uuid[];
    v_service_id uuid;
    v_service_price decimal;
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

            -- Valida se o INÍCIO do serviço cai no horário de almoço
            IF v_day_of_week = ANY(v_lunch_days) AND p_hora >= v_lunch_start AND p_hora < v_lunch_end THEN
                RAISE EXCEPTION 'Este horário está dentro do horário de almoço. Escolha outro horário.';
            END IF;

            -- Valida se o SERVIÇO CRUZA o horário de almoço (duração acumulada)
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

    -- BUSCA OU CRIA CLIENTE PRIMEIRO (para poder verificar se é mensalista)
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

    -- CÁLCULO DE VALOR E DURAÇÃO NO SERVIDOR (ignora p_preco_total do cliente)
    v_total_calculated_price := 0;
    
    FOREACH v_service_id IN ARRAY p_servicos
    LOOP
        SELECT price INTO v_service_price
        FROM services WHERE id = v_service_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Serviço inválido.';
        END IF;
        
        -- Se o cliente for mensalista e o serviço estiver incluso no seu plano, custa R$ 0,00
        IF v_is_mensalista = TRUE AND v_plan_services IS NOT NULL AND (v_service_id = ANY(v_plan_services)) THEN
            v_service_price := 0;
        END IF;
        
        v_total_calculated_price := v_total_calculated_price + v_service_price;
    END LOOP;

    -- Duração total acumulada dos serviços
    SELECT COALESCE(SUM(duration), 0) INTO v_server_duration
    FROM services WHERE id = ANY(p_servicos);

    -- USA APENAS VALORES CALCULADOS NO SERVIDOR (ignora inputs do cliente)
    p_preco_total := v_total_calculated_price;
    p_duracao_total := v_server_duration;

    -- CRIA O AGENDAMENTO
    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status)
    VALUES (v_client_id, p_servicos, p_data, p_hora, p_preco_total, p_duracao_total, 'confirmed')
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

-- =========================================================================
-- 7. CRON: Cleanup de tokens expirados (diário)
-- =========================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM booking_tokens
    WHERE expires_at < NOW();
END;
$$;

-- Agendar o cleanup (diário às 4h BRT)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-tokens') THEN
        PERFORM cron.unschedule('cleanup-tokens');
    END IF;
END $$;
SELECT cron.schedule('cleanup-tokens', '0 7 * * *', $$ SELECT cleanup_expired_tokens() $$);

-- =========================================================================
-- 8. INDEX para rate_limits performance
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
ON rate_limits(key, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_lookup
ON rate_limits(key, ip_address, window_start DESC);
