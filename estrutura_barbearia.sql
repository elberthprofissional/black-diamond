-- =========================================================================
-- BLACK DIAMOND - SCHEMA COMPLETO (SUPABASE / POSTGRESQL)
-- =========================================================================
-- Cole todo este código no SQL Editor do Supabase e clique em RUN.
-- Este arquivo contém TUDO: tabelas, funções, políticas, triggers, crons.
-- Última atualização: Sistema de emails removido. Notificações via Push.

-- =========================================================================
-- 1. EXTENSIONS
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =========================================================================
-- 2. TABELAS
-- =========================================================================

-- Tabela de segredos (API keys)
CREATE TABLE IF NOT EXISTS secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segredos: NINGUÉM acessa via client (apenas edge functions com service_role)
DROP POLICY IF EXISTS "Secrets no access" ON secrets;
CREATE POLICY "Secrets no access" ON secrets
    FOR ALL
    USING (false)
    WITH CHECK (false);

-- Tabela de serviços
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_mensalista BOOLEAN DEFAULT FALSE,
    mensalista_plan_id UUID REFERENCES mensalista_plans(id) ON DELETE SET NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    manually_added BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    service_ids UUID[] NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    total_duration INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    is_blocked BOOLEAN DEFAULT FALSE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configurações
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS para audit_logs (apenas admin pode ler)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read audit logs" ON audit_logs;
CREATE POLICY "Admin can read audit logs" ON audit_logs
    FOR SELECT
    TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Tabela de planos mensalistas
CREATE TABLE IF NOT EXISTS mensalista_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    included_service_ids UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de imagens da galeria
CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    alt TEXT DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para gallery_images (apenas admin pode acessar)
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage gallery" ON gallery_images;
CREATE POLICY "Admin can manage gallery" ON gallery_images
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Anyone can read gallery" ON gallery_images;
CREATE POLICY "Anyone can read gallery" ON gallery_images
    FOR SELECT
    TO anon
    USING (true);

-- =========================================================================
-- 3. CONFIGURAÇÕES PADRÃO
-- =========================================================================
-- Seg-sex: 08:00-19:00 / Sábado: 08:00-18:00 / Sem almoço

INSERT INTO settings (key, value) VALUES
    ('opening_time', '08:00'),
    ('closing_time', '19:00'),
    ('saturday_opening', '08:00'),
    ('saturday_closing', '18:00'),
    ('working_days', '1,2,3,4,5,6'),
    ('barber_name', 'Admin'),
    ('barber_phone', ''),
    ('mensalista_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- =========================================================================
-- 4. INDEX E VIEWS
-- =========================================================================

-- Impedir duplo agendamento
DROP INDEX IF EXISTS idx_no_double_booking;
CREATE UNIQUE INDEX idx_no_double_booking
ON bookings (booking_date, booking_time)
WHERE (status != 'cancelled');

-- Index para queries frequentes por data
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_mensalista ON clients(id) WHERE is_mensalista;
CREATE INDEX IF NOT EXISTS idx_clients_blocked ON clients(id) WHERE is_blocked;

-- View de faturamento diário
CREATE OR REPLACE VIEW faturamento_diario
WITH (security_invoker = true) AS
SELECT
  booking_date,
  SUM(total_price) as total_arrecadado,
  COUNT(id) as total_cortes
FROM bookings
WHERE status = 'completed' OR status = 'confirmed'
GROUP BY booking_date
ORDER BY booking_date DESC;

-- =========================================================================
-- 5. CARGA INICIAL DE SERVIÇOS
-- =========================================================================
INSERT INTO services (name, price, duration, description)
SELECT name, price, duration, description FROM (VALUES
  ('Corte de Cabelo', 35.00, 40, 'Corte moderno e personalizado.'),
  ('Barba', 27.00, 20, 'Aparação e modelagem de barba.'),
  ('Barba com Toalha Quente', 30.00, 30, 'Experiência relaxante com toalha quente.'),
  ('Sobrancelha', 15.00, 10, 'Limpeza e design de sobrancelha.'),
  ('Pezinho', 15.00, 10, 'Acabamento perfeito.')
) AS temp_data(name, price, duration, description)
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE services.name = temp_data.name
);

-- =========================================================================
-- 5b. CARGA INICIAL DE PLANOS MENSALISTAS
-- =========================================================================
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM mensalista_plans) = 0 THEN
    INSERT INTO mensalista_plans (name, price, included_service_ids, is_active, is_default, sort_order)
    SELECT
      v.name,
      v.price::DECIMAL(10,2),
      COALESCE(
        ARRAY(SELECT id FROM services WHERE services.name = v.service_name),
        '{}'
      ),
      true,
      true,
      v.sort_order
    FROM (VALUES
      ('Plano Black', 150.00, 'Corte de Cabelo', 1),
      ('Plano Gold', 120.00, 'Corte de Cabelo', 2)
    ) AS v(name, price, service_name, sort_order);
  END IF;
END $$;

-- =========================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =========================================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensalista_plans ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 7. POLÍTICAS DE ACESSO
-- =========================================================================

-- Serviços: leitura pública, escrita admin
DROP POLICY IF EXISTS "Serviços leitura pública" ON services;
CREATE POLICY "Serviços leitura pública" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Serviços gerenciamento admin" ON services;
CREATE POLICY "Serviços gerenciamento admin" ON services FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Clientes: apenas admin
DROP POLICY IF EXISTS "Clientes gerenciamento admin" ON clients;
CREATE POLICY "Clientes gerenciamento admin" ON clients FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Agendamentos: apenas admin + leitura pública para cancelamento
DROP POLICY IF EXISTS "Agendamentos gerenciamento admin" ON bookings;
CREATE POLICY "Agendamentos gerenciamento admin" ON bookings FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Leitura publica agendamentos futuros" ON bookings;
CREATE POLICY "Leitura publica agendamentos futuros" ON bookings FOR SELECT
USING (status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE);

-- Configurações: leitura pública, escrita admin
DROP POLICY IF EXISTS "Configurações leitura pública" ON settings;
CREATE POLICY "Configurações leitura pública" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Configurações gerenciamento admin" ON settings;
CREATE POLICY "Configurações gerenciamento admin" ON settings FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Mensalista plans: leitura pública, escrita admin
DROP POLICY IF EXISTS "Mensalista plans leitura pública" ON mensalista_plans;
CREATE POLICY "Mensalista plans leitura pública" ON mensalista_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;
CREATE POLICY "Mensalista plans admin" ON mensalista_plans FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Push subscriptions: apenas admin
DROP POLICY IF EXISTS "Push subscriptions admin" ON push_subscriptions;
CREATE POLICY "Push subscriptions admin" ON push_subscriptions FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Reviews: leitura pública, admin gerencia
DROP POLICY IF EXISTS "Reviews leitura pública" ON reviews;
CREATE POLICY "Reviews leitura pública" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Reviews admin gerencia" ON reviews;
CREATE POLICY "Reviews admin gerencia" ON reviews FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Reviews: inserção apenas para bookings concluídos (sem review duplicado)
DROP POLICY IF EXISTS "Reviews inserção pública" ON reviews;
CREATE POLICY "Reviews inserção pública" ON reviews FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id = reviews.booking_id
        AND b.status = 'completed'
        AND NOT EXISTS (
            SELECT 1 FROM reviews r WHERE r.booking_id = reviews.booking_id
        )
    )
);

-- =========================================================================
-- 8. TABELA DE ADMINS + FUNÇÃO HELPER
-- =========================================================================

-- Tabela de administradores (substitui email hardcoded)
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: apenas admin pode ver/modificar a lista de admins
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users apenas admin" ON admin_users;
CREATE POLICY "Admin users apenas admin" ON admin_users FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Inserir o admin atual (substitua o email se necessário)
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'aguirrestarlyn645@gmail.com'
ON CONFLICT DO NOTHING;

-- Função is_admin: verifica se o usuario esta na tabela admin_users
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =========================================================================
-- 9. FUNÇÕES RPC (SECURITY DEFINER)
-- =========================================================================

-- Criar agendamento
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
BEGIN
    -- VAL-1: Validação de input
    p_cliente_nome := TRIM(p_cliente_nome);
    IF p_cliente_nome = '' OR length(p_cliente_nome) < 2 THEN
        RAISE EXCEPTION 'Nome do cliente inválido (mínimo de 2 caracteres).';
    END IF;

    p_cliente_telefone := TRIM(p_cliente_telefone);
    -- Garante formato apenas de dígitos de 10 a 15 de tamanho
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

    -- VAL-2: Validação de serviço vazio
    IF p_servicos IS NULL OR array_length(p_servicos, 1) IS NULL OR array_length(p_servicos, 1) = 0 THEN
        RAISE EXCEPTION 'Selecione pelo menos um serviço.';
    END IF;

    IF p_data < CURRENT_DATE THEN
        RAISE EXCEPTION 'Não é possível agendar em uma data passada.';
    END IF;

    -- Validate booking time is within business hours
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

    SELECT COUNT(*) INTO v_daily_bookings
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_cliente_telefone
    AND b.booking_date = p_data
    AND b.status != 'cancelled';

    IF v_daily_bookings >= 3 THEN
        RAISE EXCEPTION 'Limite de 3 agendamentos por dia atingido.';
    END IF;

    -- Server-side price and duration calculation (prevent client-side manipulation)
    SELECT COALESCE(SUM(price), 0), COALESCE(SUM(duration), 0)
    INTO v_server_price, v_server_duration
    FROM services WHERE id = ANY(p_servicos);

    IF v_server_price = 0 AND array_length(p_servicos, 1) > 0 THEN
        RAISE EXCEPTION 'Serviço(s) inválido(s).';
    END IF;

    -- Use server-calculated values instead of client-supplied
    p_preco_total := v_server_price;
    p_duracao_total := v_server_duration;

    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;

    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, phone, email)
        VALUES (p_cliente_nome, p_cliente_telefone, p_cliente_email)
        RETURNING id INTO v_client_id;
    ELSIF p_cliente_email IS NOT NULL AND p_cliente_email != '' THEN
        UPDATE clients SET email = p_cliente_email WHERE id = v_client_id AND (email IS NULL OR email = '');
    END IF;

    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status)
    VALUES (v_client_id, p_servicos, p_data, p_hora, p_preco_total, p_duracao_total, 'confirmed')
    RETURNING id INTO v_booking_id;

    SELECT jsonb_build_object('id', b.id, 'client_id', b.client_id, 'status', b.status) INTO v_result
    FROM bookings b WHERE b.id = v_booking_id;

    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Horário preenchido. Escolha outro.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Slots disponíveis
CREATE OR REPLACE FUNCTION get_available_slots(p_date date)
RETURNS TABLE(slot_time text) AS $$
DECLARE
    v_opening time;
    v_closing time;
    v_day_of_week integer;
    v_hours_json jsonb;
    v_day_key text;
    v_day_enabled boolean := false;
BEGIN
    -- VAL-3: Past-date guard
    IF p_date < CURRENT_DATE THEN
        RETURN;
    END IF;

    v_day_of_week := EXTRACT(DOW FROM p_date);
    v_day_key := v_day_of_week::text;

    -- Read from barber_hours JSON (set by admin panel)
    v_hours_json := (SELECT value::jsonb FROM settings WHERE key = 'barber_hours');

    IF v_hours_json IS NOT NULL AND v_hours_json ? v_day_key THEN
        v_day_enabled := (v_hours_json->v_day_key->>'enabled')::boolean;
        IF v_day_enabled THEN
            v_opening := (v_hours_json->v_day_key->>'open')::time;
            v_closing := (v_hours_json->v_day_key->>'close')::time;
        END IF;
    ELSE
        -- Fallback to individual settings
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
        RETURN;
    END IF;

    -- PERF-1: Optimized single query generate_series without WHILE loop
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
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Horários ocupados
CREATE OR REPLACE FUNCTION get_occupied_slots(p_date date)
RETURNS TABLE(booking_time time, status text) AS $$
BEGIN
    RETURN QUERY
    SELECT b.booking_time, b.status
    FROM bookings b
    WHERE b.booking_date = p_date AND b.status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bloquear/desbloquear horário
CREATE OR REPLACE FUNCTION toggle_slot_block(p_date date, p_time time)
RETURNS jsonb AS $$
DECLARE
    v_existing_id uuid;
    v_result jsonb;
BEGIN
    SELECT b.id INTO v_existing_id
    FROM bookings b
    WHERE b.booking_date = p_date AND b.booking_time = p_time AND b.status != 'cancelled'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        UPDATE bookings SET is_blocked = NOT is_blocked WHERE id = v_existing_id RETURNING id INTO v_existing_id;
        SELECT jsonb_build_object('id', v_existing_id, 'blocked', (SELECT is_blocked FROM bookings WHERE id = v_existing_id)) INTO v_result;
        RETURN v_result;
    ELSE
        -- Opção profissional: Insere com client_id NULL para bloqueio
        INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, is_blocked)
        VALUES (NULL, '{}', p_date, p_time, 0, 0, 'confirmed', true)
        RETURNING id INTO v_existing_id;

        RETURN jsonb_build_object('id', v_existing_id, 'blocked', true);
    END IF;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Horário em conflito. Tente novamente.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Desbloquear dia inteiro
CREATE OR REPLACE FUNCTION unblock_day(p_date date)
RETURNS void AS $$
BEGIN
    UPDATE bookings
    SET is_blocked = FALSE, status = 'cancelled'
    WHERE booking_date = p_date AND is_blocked = TRUE AND status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Salvar push subscription
CREATE OR REPLACE FUNCTION save_push_subscription(
    p_endpoint text,
    p_p256dh text,
    p_auth text
)
RETURNS void AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar inscrições de push.';
    END IF;

    INSERT INTO push_subscriptions (endpoint, p256dh, auth)
    VALUES (p_endpoint, p_p256dh, p_auth)
    ON CONFLICT (endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deletar push subscription
CREATE OR REPLACE FUNCTION delete_push_subscription(p_endpoint text)
RETURNS void AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar inscrições de push.';
    END IF;

    DELETE FROM push_subscriptions WHERE endpoint = p_endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 10. AVALIAÇÕES: FUNÇÕES RPC
-- =========================================================================

CREATE OR REPLACE FUNCTION get_average_rating()
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'average', COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
        'total', COUNT(*)::integer
    ) INTO v_result
    FROM reviews;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION get_top_reviews(p_limit integer DEFAULT 10)
RETURNS TABLE(
    id UUID,
    client_name TEXT,
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, CONCAT(LEFT(c.name, 1), '****') as client_name, r.rating, r.comment, r.created_at
    FROM reviews r
    JOIN clients c ON c.id = r.client_id
    WHERE r.rating >= 4
    ORDER BY r.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 11. RESET SEMANAL AUTOMÁTICO
-- =========================================================================

CREATE OR REPLACE FUNCTION limpar_agendamentos_semana()
RETURNS void AS $$
BEGIN
    UPDATE bookings
    SET status = 'completed'
    WHERE booking_date < CURRENT_DATE
    AND status IN ('confirmed', 'pending')
    AND is_blocked = FALSE;

    UPDATE bookings
    SET is_blocked = FALSE, status = 'cancelled'
    WHERE booking_date < CURRENT_DATE
    AND is_blocked = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 12. CRON JOBS
-- =========================================================================

-- Reset semanal: todo sábado às 19:00 horário de Brasília (22:00 UTC)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-semana') THEN
        PERFORM cron.unschedule('limpar-semana');
    END IF;
END $$;

SELECT cron.schedule(
    'limpar-semana',
    '0 22 * * 6',
    $$ SELECT limpar_agendamentos_semana() $$
);

-- =========================================================================
-- 13. CRIAR USUÁRIO ADMIN
-- =========================================================================
-- IMPORTANTE: Não crie via SQL. Use o painel do Supabase:
-- 1. Authentication → Users → Add user
-- 2. Email: elberthmayan2007@gmail.com
-- 3. Defina uma senha
-- O admin ja e inserido automaticamente na tabela admin_users (secao 8)

-- =========================================================================
-- 14. GERENCIAR ADMINS (COMANDOS UTEIS)
-- =========================================================================
-- Listar admins:      SELECT au.user_id, u.email FROM admin_users au JOIN auth.users u ON u.id = au.user_id;
-- Adicionar admin:    INSERT INTO admin_users (user_id) SELECT id FROM auth.users WHERE email = 'NOVO_EMAIL';
-- Remover admin:      DELETE FROM admin_users WHERE user_id = 'UUID_DO_ADMIN';

-- =========================================================================
-- PRONTO! Tudo configurado.
-- =========================================================================
