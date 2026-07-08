-- =========================================================================
-- BLACK DIAMOND 💈 - UNIVERSAL SCHEMA
-- =========================================================================
-- Este arquivo contém TUDO que o sistema precisa:
--   ✅ Tabelas, índices, views
--   ✅ Configurações padrão
--   ✅ Dados iniciais (serviços, planos)
--   ✅ RLS (Row Level Security) + políticas
--   ✅ Funções RPC (últimas versões)
--   ✅ Cron jobs automáticos
--
-- COMO USAR:
--   1. Vá no painel do Supabase → SQL Editor
--   2. Cole este arquivo INTEIRO
--   3. Clique em RUN
--   4. Pronto! O sistema já está funcionando.
--
-- (Opcional) Crie o usuário admin:
--   Authentication → Users → Add user
--   Email do barbeiro, senha à escolha
--
-- Última atualização: Julho 2026
-- =========================================================================

-- =========================================================================
-- 1. EXTENSIONS
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =========================================================================
-- 2. TABELAS (ordenadas por dependência)
-- =========================================================================

-- 2a. Planos mensalistas (precisa existir ANTES de clients)
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

-- 2b. Segredos (API keys) — sem RLS de leitura
CREATE TABLE IF NOT EXISTS secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2c. Serviços
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2d. Clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_mensalista BOOLEAN DEFAULT FALSE,
    mensalista_plan_id UUID REFERENCES mensalista_plans(id) ON DELETE SET NULL,
    mensalista_expires_at DATE,
    is_blocked BOOLEAN DEFAULT FALSE,
    manually_added BOOLEAN DEFAULT FALSE,
    historical_visits INTEGER DEFAULT 0,
    historical_spent DECIMAL(10,2) DEFAULT 0,
    last_visit_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2e. Agendamentos
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

-- 2f. Configurações (chave-valor)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2g. Push subscriptions (notificações no navegador)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2h. Avaliações
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2i. Logs de auditoria
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

-- 2j. Imagens da galeria
CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    alt TEXT DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2k. Tokens de gerenciamento de agendamentos
CREATE TABLE IF NOT EXISTS booking_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2l. Notificações in-app
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tag TEXT,
    url TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2m. Administradores
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 3. CONFIGURAÇÕES PADRÃO
-- =========================================================================
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
-- 4. ÍNDICES, VIEWS E CONSTRAINTS
-- =========================================================================

-- Impedir duplo agendamento no mesmo horário
DROP INDEX IF EXISTS idx_no_double_booking;
CREATE UNIQUE INDEX idx_no_double_booking
ON bookings (booking_date, booking_time)
WHERE (status != 'cancelled');

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_mensalista ON clients(id) WHERE is_mensalista;
CREATE INDEX IF NOT EXISTS idx_clients_blocked ON clients(id) WHERE is_blocked;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensalista_plans_active ON mensalista_plans(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_booking_tokens_token ON booking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_booking_tokens_booking_id ON booking_tokens(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read, created_at DESC);

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

-- Constraint: regras de bloqueio vs agendamento real
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_booking_block_rules;
ALTER TABLE bookings ADD CONSTRAINT chk_booking_block_rules
CHECK (
    (is_blocked = true AND client_id IS NULL AND total_price = 0 AND total_duration = 0) OR
    (is_blocked = false AND client_id IS NOT NULL)
);

-- =========================================================================
-- 5. DADOS INICIAIS
-- =========================================================================

-- Serviços
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

-- Planos mensalistas (só insere se estiver vazio)
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
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 7. POLÍTICAS DE ACESSO
-- =========================================================================

-- Secrets: NINGUÉM acessa via client (apenas edge functions com service_role)
DROP POLICY IF EXISTS "Secrets no access" ON secrets;
CREATE POLICY "Secrets no access" ON secrets
    FOR ALL
    USING (false)
    WITH CHECK (false);

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

-- Agendamentos: admin full + leitura pública para consulta
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

-- Reviews: leitura pública, admin gerencia, inserção pública para bookings concluídos
DROP POLICY IF EXISTS "Reviews leitura pública" ON reviews;
CREATE POLICY "Reviews leitura pública" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Reviews admin gerencia" ON reviews;
CREATE POLICY "Reviews admin gerencia" ON reviews FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

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

-- Gallery: admin gerencia, público leitura
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

-- Audit logs: apenas admin
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

-- Booking tokens: apenas admin
DROP POLICY IF EXISTS "Admin can read booking tokens" ON booking_tokens;
CREATE POLICY "Admin can read booking tokens"
    ON booking_tokens FOR SELECT
    TO authenticated
    USING (is_admin());

-- Notifications: dono vê as próprias
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can mark own as read" ON notifications;
CREATE POLICY "Users can mark own as read"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Admin users: apenas admin gerencia
DROP POLICY IF EXISTS "Admin users apenas admin" ON admin_users;
CREATE POLICY "Admin users apenas admin" ON admin_users FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- =========================================================================
-- 8. FUNÇÃO is_admin()
-- =========================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- NOTA: Para adicionar o primeiro admin, rode no SQL Editor APÓS criar o usuário:
-- INSERT INTO admin_users (user_id)
-- SELECT id FROM auth.users WHERE email = 'email_do_barbeiro@gmail.com'
-- ON CONFLICT DO NOTHING;

-- =========================================================================
-- 9. FUNÇÕES RPC
-- =========================================================================

-- 9a. Criar agendamento (com validação + token de gerenciamento)
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

    -- CÁLCULO DO LADO DO SERVIDOR (impede manipulação pelo cliente)
    SELECT COALESCE(SUM(price), 0), COALESCE(SUM(duration), 0)
    INTO v_server_price, v_server_duration
    FROM services WHERE id = ANY(p_servicos);

    IF v_server_price = 0 AND array_length(p_servicos, 1) > 0 THEN
        RAISE EXCEPTION 'Serviço(s) inválido(s).';
    END IF;

    p_preco_total := v_server_price;
    p_duracao_total := v_server_duration;

    -- BUSCA OU CRIA CLIENTE
    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;

    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, phone, email)
        VALUES (p_cliente_nome, p_cliente_telefone, p_cliente_email)
        RETURNING id INTO v_client_id;
    ELSIF p_cliente_email IS NOT NULL AND p_cliente_email != '' THEN
        UPDATE clients SET email = p_cliente_email WHERE id = v_client_id AND (email IS NULL OR email = '');
    END IF;

    -- CRIA O AGENDAMENTO
    INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status)
    VALUES (v_client_id, p_servicos, p_data, p_hora, p_preco_total, p_duracao_total, 'confirmed')
    RETURNING id INTO v_booking_id;

    -- GERA TOKEN ÚNICO PARA GERENCIAMENTO
    v_token := encode(gen_random_bytes(16), 'hex');
    INSERT INTO booking_tokens (booking_id, token, expires_at)
    VALUES (v_booking_id, v_token, NOW() + INTERVAL '90 days');

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

-- 9b. Slots disponíveis
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
    IF p_date < CURRENT_DATE THEN
        RETURN;
    END IF;

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

-- 9c. Horários ocupados
CREATE OR REPLACE FUNCTION get_occupied_slots(p_date date)
RETURNS TABLE(booking_time time, status text) AS $$
BEGIN
    RETURN QUERY
    SELECT b.booking_time, b.status
    FROM bookings b
    WHERE b.booking_date = p_date AND b.status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9d. Bloquear/desbloquear horário
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

-- 9e. Desbloquear dia inteiro
CREATE OR REPLACE FUNCTION unblock_day(p_date date)
RETURNS void AS $$
BEGIN
    UPDATE bookings
    SET is_blocked = FALSE, status = 'cancelled'
    WHERE booking_date = p_date AND is_blocked = TRUE AND status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9f. Horário de funcionamento (público, SECURITY INVOKER)
CREATE OR REPLACE FUNCTION get_business_hours()
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_object_agg(key, value) INTO v_result
    FROM settings
    WHERE key IN ('opening_time', 'closing_time', 'saturday_opening', 'saturday_closing', 'working_days', 'barber_hours', 'barber_name', 'barber_phone');
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 9g. Média de avaliações (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION get_average_rating()
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'average', COALESCE(ROUND(AVG(rating), 1), 0),
        'count', COUNT(id)
    ) INTO v_result
    FROM reviews;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 9h. Top reviews (com máscara LGPD)
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

-- 9i. Salvar push subscription (com verificação admin)
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

-- 9j. Deletar push subscription
CREATE OR REPLACE FUNCTION delete_push_subscription(p_endpoint text)
RETURNS void AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar inscrições de push.';
    END IF;

    DELETE FROM push_subscriptions WHERE endpoint = p_endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9k. Auto-completar agendamentos expirados
CREATE OR REPLACE FUNCTION completar_agendamentos_expirados()
RETURNS void AS $$
DECLARE
    v_agora_brt time;
BEGIN
    v_agora_brt := (NOW() AT TIME ZONE 'America/Sao_Paulo')::time;

    -- Completa agendamentos de dias anteriores
    UPDATE bookings
    SET status = 'completed'
    WHERE booking_date < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    AND status IN ('confirmed', 'pending')
    AND is_blocked = FALSE;

    -- Completa agendamentos de HOJE que já terminaram
    UPDATE bookings
    SET status = 'completed'
    WHERE booking_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    AND status IN ('confirmed', 'pending')
    AND is_blocked = FALSE
    AND (booking_time + (total_duration || ' minutes')::interval) < v_agora_brt;

    -- Cancela bloqueios de dias anteriores
    UPDATE bookings
    SET is_blocked = FALSE, status = 'cancelled'
    WHERE booking_date < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    AND is_blocked = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9l. Limpar agendamentos da semana (legado, mantido para compatibilidade)
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

-- 9m. Verificar mensalistas (notifica vencimentos próximos + remove vencidos)
CREATE OR REPLACE FUNCTION verificar_mensalistas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client RECORD;
  v_title TEXT;
  v_body TEXT;
  v_tag TEXT;
  v_days_until_expiry INTEGER;
BEGIN
  -- Notifica sobre mensalistas próximos do vencimento
  FOR v_client IN
    SELECT id, name, mensalista_expires_at
    FROM clients
    WHERE is_mensalista = true
      AND mensalista_expires_at IS NOT NULL
      AND mensalista_expires_at <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date + 3
      AND mensalista_expires_at >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
  LOOP
    v_days_until_expiry := v_client.mensalista_expires_at - (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

    IF v_days_until_expiry = 0 THEN
      v_title := 'Mensalidade vence hoje! ⏰';
      v_body := format('A mensalidade de %s vence hoje! Renove para não perder o plano.', v_client.name);
      v_tag := format('mensalidade-hoje-%s', v_client.id);
    ELSE
      v_title := 'Mensalidade perto de vencer! ⏰';
      v_body := format('A mensalidade de %s vence em %s dias!', v_client.name, v_days_until_expiry);
      v_tag := format('mensalidade-alerta-%s', v_client.id);
    END IF;

    PERFORM
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'title', v_title,
          'body', v_body,
          'tag', v_tag
        )::text
      );
  END LOOP;

  -- Remove mensalistas vencidos
  UPDATE clients
  SET is_mensalista = false,
      mensalista_plan_id = NULL,
      mensalista_expires_at = NULL
  WHERE is_mensalista = true
    AND mensalista_expires_at IS NOT NULL
    AND mensalista_expires_at < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
END;
$$;

-- 9n. Buscar agendamentos por token
CREATE OR REPLACE FUNCTION get_bookings_by_token(p_token TEXT)
RETURNS TABLE(
    booking_id UUID,
    booking_date DATE,
    booking_time TIME,
    status TEXT,
    total_price DECIMAL,
    total_duration INTEGER,
    service_names TEXT[],
    client_name TEXT,
    client_phone TEXT,
    is_expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id AS booking_id,
        b.booking_date,
        b.booking_time,
        b.status,
        b.total_price,
        b.total_duration,
        ARRAY(
            SELECT s.name
            FROM services s
            WHERE s.id = ANY(b.service_ids)
            ORDER BY s.name
        ) AS service_names,
        c.name AS client_name,
        c.phone AS client_phone,
        (bt.expires_at < NOW()) AS is_expired
    FROM booking_tokens bt
    JOIN bookings b ON b.id = bt.booking_id
    JOIN clients c ON c.id = b.client_id
    WHERE bt.token = p_token
    AND b.status IN ('pending', 'confirmed')
    AND b.booking_date >= CURRENT_DATE
    ORDER BY b.booking_date ASC, b.booking_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 9o. Auto-bloquear horário de almoço
CREATE OR REPLACE FUNCTION auto_block_lunch_break()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config JSONB;
    v_lunch JSONB;
    v_enabled BOOLEAN;
    v_start TIME;
    v_end TIME;
    v_days INT[];
    v_tomorrow DATE;
    v_tomorrow_dow INT;
    v_slot TIME;
    v_blocked_count INT;
BEGIN
    SELECT value::JSONB INTO v_config
    FROM settings
    WHERE key = 'barber_hours'
    LIMIT 1;

    IF v_config IS NULL THEN RETURN; END IF;

    v_lunch := v_config->'lunch_break';
    IF v_lunch IS NULL THEN RETURN; END IF;

    v_enabled := (v_lunch->>'enabled')::BOOLEAN;
    IF NOT v_enabled THEN RETURN; END IF;

    v_start := (v_lunch->>'start')::TIME;
    v_end := (v_lunch->>'end')::TIME;
    IF v_start IS NULL OR v_end IS NULL OR v_start >= v_end THEN RETURN; END IF;

    v_days := ARRAY(SELECT jsonb_array_elements_text(v_lunch->'days')::INT);

    v_tomorrow := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE + 1;
    v_tomorrow_dow := EXTRACT(DOW FROM v_tomorrow)::INT;

    IF array_length(v_days, 1) > 0 AND NOT (v_tomorrow_dow = ANY(v_days)) THEN RETURN; END IF;

    v_slot := v_start;
    v_blocked_count := 0;

    WHILE v_slot < v_end LOOP
        IF NOT EXISTS (
            SELECT 1 FROM bookings
            WHERE booking_date = v_tomorrow
              AND booking_time = v_slot
              AND status IN ('confirmed', 'pending')
              AND is_blocked = FALSE
        ) THEN
            IF NOT EXISTS (
                SELECT 1 FROM bookings
                WHERE booking_date = v_tomorrow
                  AND booking_time = v_slot
                  AND is_blocked = TRUE
            ) THEN
                INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, is_blocked)
                VALUES (NULL, ARRAY[]::UUID[], v_tomorrow, v_slot, 0, 0, 'confirmed', TRUE);
                v_blocked_count := v_blocked_count + 1;
            END IF;
        END IF;
        v_slot := v_slot + INTERVAL '1 hour';
    END LOOP;

    RAISE NOTICE 'Lunch break: blocked % slots for %', v_blocked_count, v_tomorrow;
END;
$$;

-- 9p. Limpar notificações antigas (> 30 dias)
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- 9q. Preservar estatísticas do cliente antes de deletar agendamentos antigos
CREATE OR REPLACE FUNCTION preserve_client_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutoff DATE;
    v_client RECORD;
    v_old_stats RECORD;
BEGIN
    v_cutoff := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '6 months';

    FOR v_client IN
        SELECT DISTINCT client_id
        FROM bookings
        WHERE booking_date < v_cutoff
          AND status = 'completed'
          AND is_blocked = FALSE
          AND client_id IS NOT NULL
    LOOP
        SELECT
            COUNT(*) as visit_count,
            COALESCE(SUM(total_price), 0) as total_spent,
            MAX(booking_date) as last_date
        INTO v_old_stats
        FROM bookings
        WHERE client_id = v_client.client_id
          AND booking_date < v_cutoff
          AND status = 'completed'
          AND is_blocked = FALSE;

        UPDATE clients
        SET
            historical_visits = COALESCE(historical_visits, 0) + v_old_stats.visit_count,
            historical_spent = COALESCE(historical_spent, 0) + v_old_stats.total_spent,
            last_visit_date = GREATEST(COALESCE(last_visit_date, '1900-01-01'::date), v_old_stats.last_date)
        WHERE id = v_client.client_id;
    END LOOP;
END;
$$;

-- 9r. Limpeza mensal de dados antigos
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_cutoff DATE;
    v_audit_cutoff TIMESTAMPTZ;
    v_deleted_bookings INTEGER;
    v_deleted_logs INTEGER;
BEGIN
    v_booking_cutoff := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '6 months';
    v_audit_cutoff := NOW() - INTERVAL '90 days';

    PERFORM preserve_client_stats();

    DELETE FROM bookings
    WHERE booking_date < v_booking_cutoff
      AND status IN ('completed', 'cancelled')
      AND is_blocked = FALSE;
    GET DIAGNOSTICS v_deleted_bookings = ROW_COUNT;

    DELETE FROM audit_logs WHERE created_at < v_audit_cutoff;
    GET DIAGNOSTICS v_deleted_logs = ROW_COUNT;

    RAISE NOTICE 'Cleanup: deleted % bookings, % audit logs', v_deleted_bookings, v_deleted_logs;
END;
$$;

-- 9s. Relatório semanal por push notification
CREATE OR REPLACE FUNCTION send_weekly_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
    v_week_end DATE;
    v_total_revenue DECIMAL(10,2);
    v_total_completed INTEGER;
    v_total_cancelled INTEGER;
    v_top_service_name TEXT;
    v_top_service_count INTEGER;
    v_new_clients INTEGER;
    v_barber_name TEXT;
    v_body TEXT;
    v_service_rec RECORD;
    v_max_count INTEGER;
BEGIN
    v_week_end := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - 1;
    v_week_start := v_week_end - (EXTRACT(DOW FROM v_week_end)::INT + 6) % 7;

    SELECT value INTO v_barber_name FROM settings WHERE key = 'barber_name' LIMIT 1;
    IF v_barber_name IS NULL OR v_barber_name = '' THEN v_barber_name := 'Barbeiro'; END IF;

    SELECT
        COALESCE(SUM(total_price), 0),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'cancelled')
    INTO v_total_revenue, v_total_completed, v_total_cancelled
    FROM bookings
    WHERE booking_date >= v_week_start AND booking_date <= v_week_end AND is_blocked = FALSE;

    v_max_count := 0;
    v_top_service_name := '-';
    v_top_service_count := 0;

    FOR v_service_rec IN
        SELECT s.name, COUNT(*) as cnt
        FROM bookings b
        JOIN unnest(b.service_ids) AS sid ON TRUE
        JOIN services s ON s.id = sid
        WHERE b.booking_date >= v_week_start AND b.booking_date <= v_week_end AND b.status = 'completed' AND b.is_blocked = FALSE
        GROUP BY s.name
        ORDER BY cnt DESC LIMIT 1
    LOOP
        v_top_service_name := v_service_rec.name;
        v_top_service_count := v_service_rec.cnt;
    END LOOP;

    SELECT COUNT(*) INTO v_new_clients
    FROM clients
    WHERE created_at >= v_week_start AND created_at < v_week_start + INTERVAL '7 days';

    v_body := format(
        'Ola, %s! Resumo da semana (%s a %s):'
        || chr(10) || chr(10)
        || 'Faturamento: R$ %s'
        || chr(10) || 'Atendimentos: %s'
        || chr(10) || 'Cancelamentos: %s'
        || chr(10) || 'Servico mais pedido: %s (%sx)'
        || chr(10) || 'Clientes novos: %s'
        || chr(10) || chr(10)
        || 'Bom descanso!',
        v_barber_name,
        to_char(v_week_start, 'DD/MM'),
        to_char(v_week_end, 'DD/MM'),
        to_char(v_total_revenue, 'FM999G990D00'),
        v_total_completed,
        v_total_cancelled,
        v_top_service_name,
        v_top_service_count,
        v_new_clients
    );

    PERFORM
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'title', 'Relatorio Semanal 📊',
          'body', v_body,
          'tag', 'weekly-report-' || to_char(v_week_start, 'YYYY-MM-DD')
        )::text
      );

    RAISE NOTICE 'Weekly report sent for % to %', v_week_start, v_week_end;
END;
$$;

-- =========================================================================
-- 10. CRON JOBS
-- =========================================================================

-- Remove crons antigos para recriar limpos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-semana') THEN
        PERFORM cron.unschedule('limpar-semana');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'completar-diario') THEN
        PERFORM cron.unschedule('completar-diario');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'completar-tarde') THEN
        PERFORM cron.unschedule('completar-tarde');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verificar-mensalistas') THEN
        PERFORM cron.unschedule('verificar-mensalistas');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clean-notifications') THEN
        PERFORM cron.unschedule('clean-notifications');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-block-lunch') THEN
        PERFORM cron.unschedule('auto-block-lunch');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-data-cleanup') THEN
        PERFORM cron.unschedule('monthly-data-cleanup');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-report') THEN
        PERFORM cron.unschedule('weekly-report');
    END IF;
END $$;

-- CRON #1: Completar agendamentos automaticamente (00h BRT)
SELECT cron.schedule('completar-diario', '0 3 * * *', $$ SELECT completar_agendamentos_expirados() $$);

-- CRON #2: Completar agendamentos (18h BRT)
SELECT cron.schedule('completar-tarde', '0 21 * * *', $$ SELECT completar_agendamentos_expirados() $$);

-- CRON #3: Verificar mensalistas (11h BRT)
SELECT cron.schedule('verificar-mensalistas', '0 14 * * *', $$ SELECT verificar_mensalistas() $$);

-- CRON #4: Limpar notificações antigas (1h BRT)
SELECT cron.schedule('clean-notifications', '0 4 * * *', $$ SELECT clean_old_notifications() $$);

-- CRON #5: Auto-bloquear horário de almoço (23h BRT)
SELECT cron.schedule('auto-block-lunch', '2 * * * *', $$ SELECT auto_block_lunch_break() $$);

-- CRON #6: Limpeza mensal de dados (1o dia do mês, 1h BRT)
SELECT cron.schedule('monthly-data-cleanup', '0 4 1 * *', $$ SELECT cleanup_old_data() $$);

-- CRON #7: Relatório semanal (segunda-feira, 8h BRT)
SELECT cron.schedule('weekly-report', '0 11 * * 1', $$ SELECT send_weekly_report() $$);

-- =========================================================================
-- ✅ SISTEMA INSTALADO COM SUCESSO!
-- =========================================================================
-- Próximo passo: criar o usuário admin no Supabase:
--   Authentication → Users → Add user
--   Email: email_do_barbeiro@gmail.com
--   Senha: (escolha uma)
--
-- Depois rode:
--   INSERT INTO admin_users (user_id)
--   SELECT id FROM auth.users WHERE email = 'email_do_barbeiro@gmail.com'
--   ON CONFLICT DO NOTHING;
-- =========================================================================
