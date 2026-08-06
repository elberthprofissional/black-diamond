-- =========================================================================
-- BLACK DIAMOND — TODAS AS MIGRATIONS (001 → 006)
-- =========================================================================
-- Arquivo gerado por scripts/regenerate-mega.mjs a partir de
-- supabase/migrations/*.sql. Cole TUDO no SQL Editor do Supabase
-- e execute em ordem (o arquivo já está na ordem correta).
-- =========================================================================


-- >>> MIGRATION: 001_schema_rls.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 001 - SCHEMA + RLS + STORAGE
-- =========================================================================
-- Consolidado de: 001_schema_rls.sql
-- Tabelas, extensões, índices, constraints, is_admin(), políticas RLS e storage.
-- =========================================================================


-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 001_schema_rls.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 001 - SCHEMA + RLS
-- =========================================================================
-- Consolidado de: 001_schema.sql, 002_rls.sql
-- =========================================================================

-- Tabelas, extensions, indexes, constraints e RLS.
-- Estado final consolidado de todas as migrations anteriores.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- TABELAS PRINCIPAIS

-- Planos mensalistas
CREATE TABLE IF NOT EXISTS mensalista_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    included_service_ids UUID[] DEFAULT '{}',
    allowed_days INTEGER[] DEFAULT '{1,2,3,4,5}',
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Servicos
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
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
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agendamentos
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
    stats_preserved BOOLEAN DEFAULT FALSE,
    no_show BOOLEAN DEFAULT FALSE,
    coupon_id UUID,
    discount_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuracoes (chave-valor)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de auditoria
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

-- Imagens da galeria
CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    alt TEXT DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tokens de gerenciamento de agendamentos
CREATE TABLE IF NOT EXISTS booking_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notificacoes in-app
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

-- Administradores
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Depoimentos
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL,
    ip_address TEXT,
    attempts INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cupons
CREATE TABLE IF NOT EXISTS coupons (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text NOT NULL UNIQUE,
    description text DEFAULT '',
    discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free')),
    discount_value numeric NOT NULL DEFAULT 0,
    valid_from date NOT NULL DEFAULT CURRENT_DATE,
    valid_until date,
    max_uses integer,
    current_uses integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    applicable_service_ids uuid[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Milestones de fidelidade
CREATE TABLE IF NOT EXISTS loyalty_milestones (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    visits_required integer NOT NULL CHECK (visits_required > 0),
    reward_service_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Milestones resgatados por cliente
CREATE TABLE IF NOT EXISTS client_milestones (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    milestone_id uuid NOT NULL REFERENCES loyalty_milestones(id) ON DELETE CASCADE,
    claimed_at timestamptz DEFAULT now(),
    UNIQUE (client_id, milestone_id)
);

-- FOREIGN KEYS
ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_coupon
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

-- INDEXES

-- Impedir duplo agendamento no mesmo horario
DROP INDEX IF EXISTS idx_no_double_booking;
CREATE UNIQUE INDEX idx_no_double_booking
ON bookings (booking_date, booking_time)
WHERE (status != 'cancelled' AND is_blocked = FALSE);

-- Performance
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_no_show_client ON bookings(client_id, no_show, booking_date DESC) WHERE no_show = TRUE;
CREATE INDEX IF NOT EXISTS idx_clients_mensalista ON clients(id) WHERE is_mensalista;
CREATE INDEX IF NOT EXISTS idx_clients_blocked ON clients(id) WHERE is_blocked;
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensalista_plans_active ON mensalista_plans(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_booking_tokens_token ON booking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_booking_tokens_booking_id ON booking_tokens(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(key, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_lookup ON rate_limits(key, ip_address, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_client_milestones_client ON client_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_milestones_active ON loyalty_milestones(is_active) WHERE is_active;

-- CONSTRAINTS

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_booking_block_rules;
ALTER TABLE bookings ADD CONSTRAINT chk_booking_block_rules
CHECK (
    (is_blocked = true AND client_id IS NULL AND total_price = 0 AND total_duration = 0) OR
    (is_blocked = false AND client_id IS NOT NULL)
);

-- HABILITAR RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensalista_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- TABELA: reminder_logs
CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    template_id TEXT,
    template_name TEXT,
    message_preview TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_client_id ON reminder_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_id ON reminder_logs(user_id);

-- CONSTRAINT: unique service name
ALTER TABLE services ADD CONSTRAINT uq_services_name UNIQUE (name);
ALTER TABLE client_milestones ENABLE ROW LEVEL SECURITY;

-- Todas as politicas de Row Level Security + is_admin() + storage policies.
-- Estado final consolidado de todas as migrations anteriores.

-- FUNCAO is_admin()
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- POLICIAS POR TABELA

-- SERVICOS: leitura publica, escrita admin
DROP POLICY IF EXISTS "Servicos leitura publica" ON services;
CREATE POLICY "Servicos leitura publica" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Servicos gerenciamento admin" ON services;
CREATE POLICY "Servicos gerenciamento admin" ON services FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- CLIENTES: apenas admin
DROP POLICY IF EXISTS "Clientes gerenciamento admin" ON clients;
CREATE POLICY "Clientes gerenciamento admin" ON clients FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- AGENDAMENTOS: admin full + leitura publica para consulta
DROP POLICY IF EXISTS "Agendamentos gerenciamento admin" ON bookings;
CREATE POLICY "Agendamentos gerenciamento admin" ON bookings FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Leitura publica agendamentos" ON bookings;
CREATE POLICY "Leitura publica agendamentos" ON bookings FOR SELECT
USING (
    (status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE)
    OR status = 'completed'
);

-- CONFIGURACOES: leitura publica, escrita admin
DROP POLICY IF EXISTS "Configuracoes leitura publica" ON settings;
CREATE POLICY "Configuracoes leitura publica" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Configuracoes gerenciamento admin" ON settings;
CREATE POLICY "Configuracoes gerenciamento admin" ON settings FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- MENSALISTA PLANS: leitura publica, escrita admin
DROP POLICY IF EXISTS "Mensalista plans leitura publica" ON mensalista_plans;
CREATE POLICY "Mensalista plans leitura publica" ON mensalista_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;
CREATE POLICY "Mensalista plans admin" ON mensalista_plans FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- PUSH SUBSCRIPTIONS: apenas admin
DROP POLICY IF EXISTS "Push subscriptions admin" ON push_subscriptions;
CREATE POLICY "Push subscriptions admin" ON push_subscriptions FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- GALLERY: admin gerencia, publico leitura
DROP POLICY IF EXISTS "Admin can manage gallery" ON gallery_images;
CREATE POLICY "Admin can manage gallery" ON gallery_images
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Anyone can read gallery" ON gallery_images;
CREATE POLICY "Anyone can read gallery" ON gallery_images
    FOR SELECT TO anon USING (true);

-- AUDIT LOGS: apenas admin
DROP POLICY IF EXISTS "Admin can read audit logs" ON audit_logs;
CREATE POLICY "Admin can read audit logs" ON audit_logs
    FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT TO authenticated WITH CHECK (is_admin());

-- BOOKING TOKENS: apenas admin
DROP POLICY IF EXISTS "Admin can read booking tokens" ON booking_tokens;
CREATE POLICY "Admin can read booking tokens"
    ON booking_tokens FOR SELECT TO authenticated USING (is_admin());

-- NOTIFICATIONS: dono ve as proprias
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications"
    ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert own notifications" ON notifications;
CREATE POLICY "Admins can insert own notifications"
    ON notifications FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark own as read" ON notifications;
CREATE POLICY "Users can mark own as read"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE USING (auth.uid() = user_id);

-- ADMIN USERS: apenas admin gerencia
DROP POLICY IF EXISTS "Admin users apenas admin" ON admin_users;
CREATE POLICY "Admin users apenas admin" ON admin_users FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- WHATSAPP TEMPLATES: apenas admin gerencia
DROP POLICY IF EXISTS "WhatsApp templates admin" ON whatsapp_templates;
CREATE POLICY "WhatsApp templates admin"
ON whatsapp_templates FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- TESTIMONIALS: publico le ativos, admin faz tudo
DROP POLICY IF EXISTS "Public can read active testimonials" ON testimonials;
CREATE POLICY "Public can read active testimonials"
  ON testimonials FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin full access to testimonials" ON testimonials;
CREATE POLICY "Admin full access to testimonials"
  ON testimonials FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- COUPONS: apenas admin
DROP POLICY IF EXISTS "Admin can manage coupons" ON coupons;
CREATE POLICY "Admin can manage coupons"
  ON coupons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- LOYALTY MILESTONES: apenas admin
DROP POLICY IF EXISTS "Admin manage loyalty_milestones" ON loyalty_milestones;
CREATE POLICY "Admin manage loyalty_milestones"
  ON loyalty_milestones FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- CLIENT MILESTONES: admin le, sistema insere
DROP POLICY IF EXISTS "Admin read client_milestones" ON client_milestones;
CREATE POLICY "Admin read client_milestones"
  ON client_milestones FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "System insert client_milestones" ON client_milestones;
CREATE POLICY "System insert client_milestones"
  ON client_milestones FOR INSERT TO authenticated WITH CHECK (is_admin());

-- RATE LIMITS: nenhuma politica de acesso direto
-- Apenas SECURITY DEFINER functions acessam (bypass RLS)

-- STORAGE POLICIES

-- Gallery bucket: leitura publica, escrita apenas admin
DROP POLICY IF EXISTS "Gallery: public read" ON storage.objects;
CREATE POLICY "Gallery: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Gallery: admin insert" ON storage.objects;
CREATE POLICY "Gallery: admin insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery' AND is_admin());

DROP POLICY IF EXISTS "Gallery: admin delete" ON storage.objects;
CREATE POLICY "Gallery: admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery' AND is_admin());

DROP POLICY IF EXISTS "Gallery: admin update" ON storage.objects;
CREATE POLICY "Gallery: admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'gallery' AND is_admin())
WITH CHECK (bucket_id = 'gallery' AND is_admin());

-- Avatars bucket: leitura publica, escrita apenas admin
DROP POLICY IF EXISTS "Avatars: public read" ON storage.objects;
CREATE POLICY "Avatars: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars: admin all" ON storage.objects;
CREATE POLICY "Avatars: admin all"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND is_admin())
WITH CHECK (bucket_id = 'avatars' AND is_admin());

-- >>> MIGRATION: 002_functions_triggers.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 002 - FUNÇÕES + TRIGGERS + SEED + CRON
-- =========================================================================
-- Consolidado de: 002_functions_triggers.sql, 003_seed_cron.sql
-- Funções RPC (última versão), triggers de notificação, seeds e cron jobs.
-- =========================================================================


-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 002_functions_triggers.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 002 - FUNÇÕES + TRIGGERS
-- =========================================================================
-- Consolidado de: 003_functions.sql, 004_triggers.sql
-- =========================================================================

-- Todas as funcoes RPC (Server Functions).
-- Estado final consolidado - versoes mais completas de cada funcao.

-- LIMPAR ASSINATURAS DUPLICADAS (de migrations anteriores)
-- CREATE OR REPLACE nao substitui assinaturas diferentes — precisa DROP

-- Dropar TODAS as versoes de criar_agendamento_rate_limited
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time without time zone, numeric, integer, text);
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time without time zone, numeric, integer, text, uuid, numeric);

-- Dropar TODAS as versoes de criar_agendamento
DROP FUNCTION IF EXISTS criar_agendamento(text, text, uuid[], date, time without time zone, numeric, integer, text);
DROP FUNCTION IF EXISTS criar_agendamento(text, text, uuid[], date, time without time zone, numeric, integer, text, uuid);

-- 1. AGENDAMENTOS

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

-- 2. SLOTS E HORARIOS

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
        AND (p_barber_id IS NULL OR b.barber_id = p_barber_id)
    )
    AND (NOT v_lunch_enabled OR NOT (v_day_of_week = ANY(v_lunch_days)) OR slot::time < v_lunch_start OR slot::time >= v_lunch_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_occupied_slots(p_date date, p_barber_id uuid DEFAULT NULL)
RETURNS TABLE(booking_time time, status text) AS $$
BEGIN
    RETURN QUERY SELECT b.booking_time, b.status
    FROM bookings b
    WHERE b.booking_date = p_date
    AND b.status != 'cancelled'
    AND (p_barber_id IS NULL OR b.barber_id = p_barber_id);
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

-- 3. CONSULTAS PUBLICAS

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

-- 4. CONFIGURACOES

CREATE OR REPLACE FUNCTION get_business_hours()
RETURNS jsonb AS $$
DECLARE v_result jsonb;
BEGIN
    SELECT jsonb_object_agg(key, value) INTO v_result FROM settings
    WHERE key IN ('opening_time', 'closing_time', 'saturday_opening', 'saturday_closing', 'working_days', 'barber_hours', 'barber_name', 'barber_phone');
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 5. NO-SHOW

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

-- 6. FIDELIDADE

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

-- Removed public access: milestones expose visit counts and reward data
-- Only admins should query this via the admin panel
-- GRANT EXECUTE ON FUNCTION get_client_milestones_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION increment_client_visit(p_client_id UUID)
RETURNS void AS $$
BEGIN
    -- Only admins or the system (via SECURITY DEFINER booking flow) should call this
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;
    UPDATE clients SET historical_visits = COALESCE(historical_visits, 0) + 1 WHERE id = p_client_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cliente nao encontrado.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CUPONS

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

-- 8. RATE LIMITING

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

-- 9. PUSH NOTIFICATIONS

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

-- 10. MANUTENCAO AUTOMATICA

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

-- 11. HEALTH CHECK

CREATE OR REPLACE FUNCTION health_check()
RETURNS jsonb AS $$
DECLARE v_status TEXT := 'ok'; v_s INTEGER; v_b INTEGER; v_c INTEGER;
BEGIN
    BEGIN SELECT COUNT(*) INTO v_s FROM services; SELECT COUNT(*) INTO v_b FROM bookings; SELECT COUNT(*) INTO v_c FROM clients;
    EXCEPTION WHEN OTHERS THEN v_status := 'error'; END;
    RETURN jsonb_build_object('status', v_status, 'timestamp', NOW(), 'version', '3.23.0',
        'database', jsonb_build_object('services', v_s, 'bookings', v_b, 'clients', v_c),
        'uptime', EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time()))::integer);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Gatilhos de notificacao automatica e replicacao em tempo real.

-- CONFIGURACAO PADRAO

INSERT INTO settings (key, value) VALUES ('site_url', 'https://black-diamond.vercel.app')
ON CONFLICT (key) DO NOTHING;

-- GATILHO: NOTIFICACAO AO CRIAR AGENDAMENTO (via token)

CREATE OR REPLACE FUNCTION handle_booking_token_inserted()
RETURNS TRIGGER AS $$
DECLARE
    v_booking RECORD;
    v_client RECORD;
    v_service_names text;
    v_formatted_date text;
    v_formatted_price text;
    v_mensalista_tag text := '';
    v_clean_phone text;
    v_site_url text;
    v_manage_url text;
    v_notif_body text;
    v_admin_id uuid;
BEGIN
    SELECT * INTO v_booking FROM bookings WHERE id = NEW.booking_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

    SELECT * INTO v_client FROM clients WHERE id = v_booking.client_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

    SELECT string_agg(s.name, ', ' ORDER BY s.name) INTO v_service_names
    FROM services s WHERE s.id = ANY(v_booking.service_ids);

    v_formatted_date := to_char(v_booking.booking_date, 'DD/MM/YYYY') || ' as ' || substring(v_booking.booking_time::text from 1 for 5);
    v_formatted_price := 'R$ ' || replace(to_char(v_booking.total_price, 'FM999990.00'), '.', ',');

    IF v_client.is_mensalista = TRUE AND (v_client.mensalista_expires_at IS NULL OR v_client.mensalista_expires_at >= NOW()) THEN
        v_mensalista_tag := ' [MENSALISTA]';
    END IF;

    v_clean_phone := regexp_replace(v_client.phone, '\D', '', 'g');

    SELECT COALESCE(value, 'https://black-diamond.vercel.app') INTO v_site_url
    FROM settings WHERE key = 'site_url';

    v_manage_url := v_site_url || '/gerenciar?token=' || NEW.token;

    v_notif_body := jsonb_build_object(
        'clientName', TRIM(v_client.name),
        'isMensalista', (v_client.is_mensalista = TRUE AND (v_client.mensalista_expires_at IS NULL OR v_client.mensalista_expires_at >= NOW())),
        'services', COALESCE(v_service_names, 'Servico'),
        'dateTime', v_formatted_date,
        'totalPrice', v_formatted_price,
        'clientPhone', v_clean_phone,
        'manageUrl', v_manage_url
    )::text;

    FOR v_admin_id IN SELECT user_id FROM admin_users LOOP
        INSERT INTO notifications (user_id, title, body, tag, url)
        VALUES (v_admin_id, 'Novo Agendamento!', v_notif_body, 'booking-' || NEW.booking_id::text, '/admin');
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_token_inserted ON booking_tokens;
CREATE TRIGGER trg_booking_token_inserted
AFTER INSERT ON booking_tokens
FOR EACH ROW
EXECUTE FUNCTION handle_booking_token_inserted();

-- GATILHO: NOTIFICACAO AO CANCELAR AGENDAMENTO

CREATE OR REPLACE FUNCTION handle_booking_cancelled()
RETURNS TRIGGER AS $$
DECLARE
    v_client_name TEXT;
    v_service_names TEXT;
    v_formatted_date TEXT;
    v_formatted_time TEXT;
    v_clean_phone TEXT;
    v_admin_id UUID;
BEGIN
    IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

    SELECT name, phone INTO v_client_name, v_clean_phone
    FROM clients WHERE id = NEW.client_id;

    SELECT string_agg(s.name, ', ' ORDER BY s.name) INTO v_service_names
    FROM services s WHERE s.id = ANY(NEW.service_ids);

    v_formatted_date := to_char(NEW.booking_date, 'DD/MM/YYYY');
    v_formatted_time := substring(NEW.booking_time::text from 1 for 5);

    IF v_clean_phone IS NOT NULL THEN
        v_clean_phone := regexp_replace(v_clean_phone, '\D', '', 'g');
    END IF;

    DELETE FROM notifications WHERE tag = 'booking-' || NEW.id::text;

    FOR v_admin_id IN SELECT user_id FROM admin_users LOOP
        INSERT INTO notifications (user_id, title, body, tag, url)
        VALUES (
            v_admin_id,
            'Agendamento Cancelado',
            jsonb_build_object(
                'clientName', COALESCE(v_client_name, 'Cliente'),
                'services', COALESCE(v_service_names, 'Servico'),
                'dateTime', v_formatted_date || ' as ' || v_formatted_time,
                'totalPrice', 'R$ ' || replace(to_char(NEW.total_price, 'FM999990.00'), '.', ','),
                'clientPhone', COALESCE(v_clean_phone, '---'),
                'manageUrl', 'Cancelado'
            )::text,
            'cancelled-' || NEW.id::text,
            '/admin/agendamentos'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_status_cancelled ON bookings;
CREATE TRIGGER trg_booking_status_cancelled
AFTER UPDATE OF status ON bookings
FOR EACH ROW
WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
EXECUTE FUNCTION handle_booking_cancelled();

-- REALTIME

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END
$$;

-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 003_seed_cron.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 003 - SEED + CRON
-- =========================================================================
-- Consolidado de: 005_seed_cron.sql
-- =========================================================================

-- Servicos, planos, configuracoes, depoimentos, cupons, milestones e cron.

-- SEED DATA

-- Servicos
INSERT INTO services (name, price, duration, description)
SELECT name, price, duration, description FROM (VALUES
    ('Corte de Cabelo', 35.00, 40, ''),
    ('Barba', 27.00, 20, 'Aparacao e modelagem de barba.'),
    ('Barba com Toalha Quente', 30.00, 30, ''),
    ('Sobrancelha', 15.00, 10, ''),
    ('Pezinho', 15.00, 10, '')
) AS temp_data(name, price, duration, description)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE services.name = temp_data.name);

-- Planos mensalistas
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

-- Configuracoes padrao
INSERT INTO settings (key, value) VALUES
    ('opening_time', '08:00'),
    ('closing_time', '19:00'),
    ('saturday_opening', '08:00'),
    ('saturday_closing', '18:00'),
    ('working_days', '1,2,3,4,5,6'),
    ('barber_name', 'Admin'),
    ('barber_phone', ''),
    ('mensalista_enabled', 'true'),
    ('max_no_shows', '3'),
    ('multi_barber_enabled', 'false'),
    ('lunch_start', '12:00'),
    ('lunch_end', '13:00')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Depoimentos
INSERT INTO testimonials (name, rating, text, sort_order) VALUES
    ('YP TATTOO', 5, 'Barbearia super confortavel, ambiente agradavel, profissional qualificado e atencioso.', 1),
    ('HELBERT HENRIQUE', 5, 'Venezuelano mais fera de BH!! Tem o macete.', 2),
    ('MAIA STUDIO', 5, 'Unico profissional que conseguiu cortar o cabelo do meu filho com paciencia e excelencia.', 3),
    ('GIOVANNA CARDOSO', 5, 'Profissional agradavel, super atencioso, trabalho impecavel e corte perfeito. Super recomendo!', 4),
    ('GUILHERME HENRIQUE', 5, 'Otim profissional, lugar aconchegante e trabalho impecavel!', 5),
    ('MATHEUS', 5, 'Tato e bom demais, cara sabe como cuidar de um cabelo.', 6)
ON CONFLICT DO NOTHING;

-- Cupons: o barbeiro cria manualmente pelo painel Settings > Cupons

-- Milestones de fidelidade
INSERT INTO loyalty_milestones (id, visits_required, reward_service_id, is_active)
VALUES
    ('c0000001-0000-0000-0000-000000000001', 5, (SELECT id FROM services WHERE name = 'Sobrancelha'), true),
    ('c0000002-0000-0000-0000-000000000002', 10, (SELECT id FROM services WHERE name = 'Pezinho'), true)
ON CONFLICT (id) DO NOTHING;

-- CRON JOBS

-- Remover jobs existentes antes de recriar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-block-lunch') THEN PERFORM cron.unschedule('auto-block-lunch'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'completar-agendamentos') THEN PERFORM cron.unschedule('completar-agendamentos'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verificar-mensalistas') THEN PERFORM cron.unschedule('verificar-mensalistas'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-cleanup') THEN PERFORM cron.unschedule('monthly-cleanup'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-report') THEN PERFORM cron.unschedule('weekly-report'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-all') THEN PERFORM cron.unschedule('cleanup-all'); END IF;
END $$;

-- 1. Completar agendamentos expirados (a cada 15 min)
SELECT cron.schedule('completar-agendamentos', '*/15 * * * *', $$ SELECT completar_agendamentos_expirados() $$);

-- 2. Cleanup diario: tokens + notificacoes + rate limits (6h da manha)
SELECT cron.schedule('cleanup-all', '0 6 * * *', $$
    DELETE FROM booking_tokens WHERE expires_at < NOW();
    DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
$$);

-- 3. Bloquear horarios de almoco (3h da manha)
SELECT cron.schedule('auto-block-lunch', '0 3 * * *', $$ SELECT auto_block_lunch_break() $$);

-- 4. Verificar mensalistas proximos do vencimento (11h da manha)
SELECT cron.schedule('verificar-mensalistas', '0 11 * * *', $$ SELECT verificar_mensalistas() $$);

-- 5. Limpeza mensal de dados antigos (dia 1, 5h da manha)
SELECT cron.schedule('monthly-cleanup', '0 5 1 * *', $$ SELECT cleanup_old_data() $$);

-- 6. Relatorio semanal (domingo, 23h)
SELECT cron.schedule('weekly-report', '0 23 * * 0', $$ SELECT send_weekly_report() $$);

-- >>> MIGRATION: 003_features_fixes.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 003 - FEATURES + FIXES
-- =========================================================================
-- Consolidado de: 004_features.sql, 005_fixes.sql
-- Multi-barbeiro (barbers, barber_settings), mensalista_plans, correções de RPCs e notificações.
-- =========================================================================


-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 004_features.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 004 - FEATURES
-- =========================================================================
-- Consolidado de: 006_multi_barber.sql, 007_mensalista_reborn.sql, 008_auto_complete_2h_buffer.sql
-- =========================================================================

-- Versao sem REFERENCES auth.users para execucao via Management API.
-- A FK pode ser adicionada manualmente depois.

-- 1. TABELA barbers (sem FK auth.users)
CREATE TABLE IF NOT EXISTS barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    name TEXT NOT NULL,
    phone TEXT,
    photo_url TEXT,
    bio TEXT,
    quote TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_owner BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON barbers(user_id);
CREATE INDEX IF NOT EXISTS idx_barbers_active ON barbers(is_active) WHERE is_active = TRUE;

-- 2. ADICIONAR barber_id NA TABELA bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber_id UUID;
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);

-- 3. ATUALIZAR INDEX UNICO DE DOUBLE-BOOKING
DROP INDEX IF EXISTS idx_no_double_booking;
CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking
    ON bookings(booking_date, booking_time, barber_id)
    WHERE status IN ('pending', 'confirmed') AND barber_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking_legacy
    ON bookings(booking_date, booking_time)
    WHERE status IN ('pending', 'confirmed') AND barber_id IS NULL;

-- 4. TABELA barber_settings (horarios por barbeiro)
CREATE TABLE IF NOT EXISTS barber_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(barber_id, key)
);

CREATE INDEX IF NOT EXISTS idx_barber_settings_barber_id ON barber_settings(barber_id);

-- 5. RLS PARA barbers
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Barbeiros leitura publica" ON barbers;
CREATE POLICY "Barbeiros leitura publica" ON barbers
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Barbeiros gerenciamento admin" ON barbers;
CREATE POLICY "Barbeiros gerenciamento admin" ON barbers
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- 6. RLS PARA barber_settings
ALTER TABLE barber_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Barber settings leitura publica" ON barber_settings;
CREATE POLICY "Barber settings leitura publica" ON barber_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Barber settings gerenciamento admin" ON barber_settings;
CREATE POLICY "Barber settings gerenciamento admin" ON barber_settings
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- 7. RPC: get_barbers
CREATE OR REPLACE FUNCTION get_barbers()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    phone TEXT,
    photo_url TEXT,
    bio TEXT,
    quote TEXT,
    is_active BOOLEAN,
    is_owner BOOLEAN,
    sort_order INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.user_id, b.name, b.phone, b.photo_url, b.bio, b.quote,
           b.is_active, b.is_owner, b.sort_order, b.created_at
    FROM barbers b
    WHERE b.is_active = TRUE
    ORDER BY b.sort_order ASC, b.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8. RPC: get_barber_by_user_id
CREATE OR REPLACE FUNCTION get_barber_by_user_id(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    photo_url TEXT,
    bio TEXT,
    quote TEXT,
    is_owner BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.name, b.phone, b.photo_url, b.bio, b.quote, b.is_owner
    FROM barbers b
    WHERE b.user_id = p_user_id AND b.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 9. RPC: upsert_barber
CREATE OR REPLACE FUNCTION upsert_barber(
    p_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_photo_url TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_quote TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT TRUE,
    p_is_owner BOOLEAN DEFAULT FALSE,
    p_sort_order INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_barber_id UUID;
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
            sort_order = COALESCE(p_sort_order, sort_order)
        WHERE id = p_id
        RETURNING id INTO v_barber_id;
    ELSE
        INSERT INTO barbers (user_id, name, phone, photo_url, bio, quote, is_active, is_owner, sort_order)
        VALUES (p_user_id, p_name, p_phone, p_photo_url, p_bio, p_quote, p_is_active, p_is_owner, p_sort_order)
        RETURNING id INTO v_barber_id;
    END IF;

    RETURN v_barber_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: delete_barber
CREATE OR REPLACE FUNCTION delete_barber(p_barber_id UUID, p_hard BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem remover barbeiros';
    END IF;

    IF p_hard THEN
        DELETE FROM barbers WHERE id = p_barber_id AND is_owner = FALSE;
    ELSE
        UPDATE barbers SET is_active = FALSE WHERE id = p_barber_id AND is_owner = FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. MIGRAR DADOS DO BARBEIRO SOLO PARA TABELA barbers
DO $$
DECLARE
    v_barber_name TEXT;
    v_barber_phone TEXT;
    v_barber_bio TEXT;
    v_barber_quote TEXT;
    v_barber_photo TEXT;
    v_owner_id UUID;
BEGIN
    SELECT value INTO v_barber_name FROM settings WHERE key = 'barber_name';
    SELECT value INTO v_barber_phone FROM settings WHERE key = 'barber_phone';
    SELECT value INTO v_barber_bio FROM settings WHERE key = 'barber_bio';
    SELECT value INTO v_barber_quote FROM settings WHERE key = 'barber_quote';
    SELECT value INTO v_barber_photo FROM settings WHERE key = 'barber_photo';
    SELECT user_id INTO v_owner_id FROM admin_users LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM barbers WHERE is_owner = TRUE) THEN
        INSERT INTO barbers (user_id, name, phone, photo_url, bio, quote, is_active, is_owner, sort_order)
        VALUES (
            v_owner_id,
            COALESCE(v_barber_name, 'Barbeiro'),
            v_barber_phone,
            v_barber_photo,
            COALESCE(v_barber_bio, 'Acredito que a barbearia é um dos poucos lugares onde o homem pode relaxar de verdade.'),
            COALESCE(v_barber_quote, 'Não sou o melhor, mas sou o melhor para você.'),
            TRUE,
            TRUE,
            0
        );
    END IF;
END $$;

-- 12. ATUALIZAR TRIGGERS DE NOTIFICACAO (COM MULTI-BARBER)

CREATE OR REPLACE FUNCTION handle_booking_token_inserted()
RETURNS TRIGGER AS $$
DECLARE
    v_booking RECORD;
    v_client RECORD;
    v_service_names text;
    v_formatted_date text;
    v_formatted_price text;
    v_mensalista_tag text := '';
    v_clean_phone text;
    v_site_url text;
    v_manage_url text;
    v_notif_body text;
    v_admin_id uuid;
    v_barber_user_id uuid;
BEGIN
    SELECT * INTO v_booking FROM bookings WHERE id = NEW.booking_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

    SELECT * INTO v_client FROM clients WHERE id = v_booking.client_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

    SELECT string_agg(s.name, ', ' ORDER BY s.name) INTO v_service_names
    FROM services s WHERE s.id = ANY(v_booking.service_ids);

    v_formatted_date := to_char(v_booking.booking_date, 'DD/MM/YYYY') || ' as ' || substring(v_booking.booking_time::text from 1 for 5);
    v_formatted_price := 'R$ ' || replace(to_char(v_booking.total_price, 'FM999990.00'), '.', ',');

    IF v_client.is_mensalista = TRUE AND (v_client.mensalista_expires_at IS NULL OR v_client.mensalista_expires_at >= NOW()) THEN
        v_mensalista_tag := ' [MENSALISTA]';
    END IF;

    v_clean_phone := regexp_replace(v_client.phone, '\D', '', 'g');

    SELECT COALESCE(value, 'https://black-diamond.vercel.app') INTO v_site_url
    FROM settings WHERE key = 'site_url';

    v_manage_url := v_site_url || '/gerenciar?token=' || NEW.token;

    v_notif_body := jsonb_build_object(
        'clientName', TRIM(v_client.name),
        'isMensalista', (v_client.is_mensalista = TRUE AND (v_client.mensalista_expires_at IS NULL OR v_client.mensalista_expires_at >= NOW())),
        'services', COALESCE(v_service_names, 'Servico'),
        'dateTime', v_formatted_date,
        'totalPrice', v_formatted_price,
        'clientPhone', v_clean_phone,
        'manageUrl', v_manage_url
    )::text;

    IF v_booking.barber_id IS NOT NULL THEN
        SELECT user_id INTO v_barber_user_id FROM barbers WHERE id = v_booking.barber_id;

        IF v_barber_user_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (v_barber_user_id, 'Novo Agendamento!', v_notif_body, 'booking-' || NEW.booking_id::text, '/admin');
        END IF;

        FOR v_admin_id IN SELECT user_id FROM admin_users WHERE user_id != v_barber_user_id LOOP
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (v_admin_id, 'Novo Agendamento!', v_notif_body, 'booking-' || NEW.booking_id::text, '/admin');
        END LOOP;
    ELSE
        FOR v_admin_id IN SELECT user_id FROM admin_users LOOP
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (v_admin_id, 'Novo Agendamento!', v_notif_body, 'booking-' || NEW.booking_id::text, '/admin');
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_token_inserted ON booking_tokens;
CREATE TRIGGER trg_booking_token_inserted
AFTER INSERT ON booking_tokens
FOR EACH ROW
EXECUTE FUNCTION handle_booking_token_inserted();

CREATE OR REPLACE FUNCTION handle_booking_cancelled()
RETURNS TRIGGER AS $$
DECLARE
    v_client_name TEXT;
    v_service_names TEXT;
    v_formatted_date TEXT;
    v_formatted_time TEXT;
    v_clean_phone TEXT;
    v_admin_id UUID;
    v_barber_user_id UUID;
BEGIN
    IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

    SELECT name, phone INTO v_client_name, v_clean_phone
    FROM clients WHERE id = NEW.client_id;

    SELECT string_agg(s.name, ', ' ORDER BY s.name) INTO v_service_names
    FROM services s WHERE s.id = ANY(NEW.service_ids);

    v_formatted_date := to_char(NEW.booking_date, 'DD/MM/YYYY');
    v_formatted_time := substring(NEW.booking_time::text from 1 for 5);

    IF v_clean_phone IS NOT NULL THEN
        v_clean_phone := regexp_replace(v_clean_phone, '\D', '', 'g');
    END IF;

    DELETE FROM notifications WHERE tag = 'booking-' || NEW.id::text;

    IF NEW.barber_id IS NOT NULL THEN
        SELECT user_id INTO v_barber_user_id FROM barbers WHERE id = NEW.barber_id;

        IF v_barber_user_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (
                v_barber_user_id,
                'Agendamento Cancelado',
                jsonb_build_object(
                    'clientName', COALESCE(v_client_name, 'Cliente'),
                    'services', COALESCE(v_service_names, 'Servico'),
                    'dateTime', v_formatted_date || ' as ' || v_formatted_time,
                    'totalPrice', 'R$ ' || replace(to_char(NEW.total_price, 'FM999990.00'), '.', ','),
                    'clientPhone', COALESCE(v_clean_phone, '---'),
                    'manageUrl', 'Cancelado'
                )::text,
                'cancelled-' || NEW.id::text,
                '/admin/agendamentos'
            );
        END IF;

        FOR v_admin_id IN SELECT user_id FROM admin_users WHERE user_id != v_barber_user_id LOOP
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (
                v_admin_id,
                'Agendamento Cancelado',
                jsonb_build_object(
                    'clientName', COALESCE(v_client_name, 'Cliente'),
                    'services', COALESCE(v_service_names, 'Servico'),
                    'dateTime', v_formatted_date || ' as ' || v_formatted_time,
                    'totalPrice', 'R$ ' || replace(to_char(NEW.total_price, 'FM999990.00'), '.', ','),
                    'clientPhone', COALESCE(v_clean_phone, '---'),
                    'manageUrl', 'Cancelado'
                )::text,
                'cancelled-' || NEW.id::text,
                '/admin/agendamentos'
            );
        END LOOP;
    ELSE
        FOR v_admin_id IN SELECT user_id FROM admin_users LOOP
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (
                v_admin_id,
                'Agendamento Cancelado',
                jsonb_build_object(
                    'clientName', COALESCE(v_client_name, 'Cliente'),
                    'services', COALESCE(v_service_names, 'Servico'),
                    'dateTime', v_formatted_date || ' as ' || v_formatted_time,
                    'totalPrice', 'R$ ' || replace(to_char(NEW.total_price, 'FM999990.00'), '.', ','),
                    'clientPhone', COALESCE(v_clean_phone, '---'),
                    'manageUrl', 'Cancelado'
                )::text,
                'cancelled-' || NEW.id::text,
                '/admin/agendamentos'
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_status_cancelled ON bookings;
CREATE TRIGGER trg_booking_status_cancelled
AFTER UPDATE OF status ON bookings
FOR EACH ROW
WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
EXECUTE FUNCTION handle_booking_cancelled();

-- 13. HEALTH CHECK ATUALIZADO (v3.22.0)
CREATE OR REPLACE FUNCTION health_check()
RETURNS jsonb AS $$
DECLARE v_status TEXT := 'ok'; v_s INTEGER; v_b INTEGER; v_c INTEGER; v_b2 INTEGER;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO v_s FROM services;
        SELECT COUNT(*) INTO v_b FROM bookings;
        SELECT COUNT(*) INTO v_c FROM clients;
        SELECT COUNT(*) INTO v_b2 FROM barbers;
    EXCEPTION WHEN OTHERS THEN v_status := 'error'; END;
    RETURN jsonb_build_object('status', v_status, 'timestamp', NOW(), 'version', '3.23.0',
        'database', jsonb_build_object('services', v_s, 'bookings', v_b, 'clients', v_c, 'barbers', v_b2),
        'uptime', EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time()))::integer);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 14. REMOVER MENSALISTA PLANS (antiga migration 007)
-- A UI de gerenciamento de planos mensalistas foi removida.
-- Remove a tabela obsoleta e ajusta a foreign key em clients.
-- A flag is_mensalista em clients ainda é funcional (toggle manual).

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_mensalista_plan_id_fkey;
DROP INDEX IF EXISTS idx_mensalista_plans_active;
DROP POLICY IF EXISTS "Mensalista plans leitura publica" ON mensalista_plans;
DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;
DROP TABLE IF EXISTS mensalista_plans CASCADE;
DROP FUNCTION IF EXISTS verificar_mensalistas CASCADE;

-- Recria a tabela mensalista_plans, RLS, funcoes RPC e cron de verificacao.
-- A migration 006 removeu a tabela original por falta de UI.
-- Agora a UI e completa com CRUD, badge, booking inteligente e notificacoes.

-- 1. RECRIAR TABELA mensalista_plans
CREATE TABLE IF NOT EXISTS mensalista_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    included_service_ids UUID[] DEFAULT '{}',
    allowed_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',
    duration_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate foreign key from clients
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_mensalista_plan_id_fkey;
ALTER TABLE clients ADD CONSTRAINT clients_mensalista_plan_id_fkey
    FOREIGN KEY (mensalista_plan_id) REFERENCES mensalista_plans(id) ON DELETE SET NULL;

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_mensalista_plans_active ON mensalista_plans(is_active) WHERE is_active;

-- 3. RLS
ALTER TABLE mensalista_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mensalista plans leitura publica" ON mensalista_plans;
CREATE POLICY "Mensalista plans leitura publica" ON mensalista_plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;
CREATE POLICY "Mensalista plans admin" ON mensalista_plans
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- 4. RPC: get_mensalista_plans
CREATE OR REPLACE FUNCTION get_mensalista_plans()
RETURNS TABLE (
    id UUID,
    name TEXT,
    price DECIMAL,
    included_service_ids UUID[],
    allowed_days INTEGER[],
    duration_days INTEGER,
    is_active BOOLEAN,
    is_default BOOLEAN,
    sort_order INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT mp.id, mp.name, mp.price, mp.included_service_ids, mp.allowed_days,
           mp.duration_days, mp.is_active, mp.is_default, mp.sort_order, mp.created_at
    FROM mensalista_plans mp
    WHERE mp.is_active = TRUE
    ORDER BY mp.sort_order ASC, mp.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. RPC: upsert_mensalista_plan
CREATE OR REPLACE FUNCTION upsert_mensalista_plan(
    p_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_price DECIMAL DEFAULT NULL,
    p_included_service_ids UUID[] DEFAULT NULL,
    p_allowed_days INTEGER[] DEFAULT NULL,
    p_duration_days INTEGER DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL,
    p_is_default BOOLEAN DEFAULT NULL,
    p_sort_order INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_plan_id UUID;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem gerenciar planos mensalistas';
    END IF;

    IF p_id IS NOT NULL THEN
        UPDATE mensalista_plans SET
            name = COALESCE(p_name, name),
            price = COALESCE(p_price, price),
            included_service_ids = COALESCE(p_included_service_ids, included_service_ids),
            allowed_days = COALESCE(p_allowed_days, allowed_days),
            duration_days = COALESCE(p_duration_days, duration_days),
            is_active = COALESCE(p_is_active, is_active),
            is_default = COALESCE(p_is_default, is_default),
            sort_order = COALESCE(p_sort_order, sort_order)
        WHERE id = p_id
        RETURNING id INTO v_plan_id;
    ELSE
        INSERT INTO mensalista_plans (name, price, included_service_ids, allowed_days, duration_days, is_active, is_default, sort_order)
        VALUES (p_name, p_price, p_included_service_ids, p_allowed_days, p_duration_days, p_is_active, p_is_default, p_sort_order)
        RETURNING id INTO v_plan_id;
    END IF;

    RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: delete_mensalista_plan
CREATE OR REPLACE FUNCTION delete_mensalista_plan(p_plan_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem remover planos mensalistas';
    END IF;

    -- Set clients with this plan to null
    UPDATE clients SET mensalista_plan_id = NULL, is_mensalista = FALSE
    WHERE mensalista_plan_id = p_plan_id;

    DELETE FROM mensalista_plans WHERE id = p_plan_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ATUALIZAR FUNCAO criar_agendamento PARA USAR NOVA TABELA
-- A funcao criar_agendamento ja referencia mensalista_plans,
-- entao ela voltara a funcionar automaticamente com a tabela recriada.
-- A query em criar_agendamento que faz:
--   SELECT included_service_ids FROM mensalista_plans WHERE id = v_plan_id AND is_active = TRUE
-- agora funcionara novamente.

-- 8. RECRIAR verificar_mensalistas COM NOTIFICACOES IN-APP
CREATE OR REPLACE FUNCTION verificar_mensalistas()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_client RECORD;
    v_title TEXT;
    v_body TEXT;
    v_tag TEXT;
    v_days INTEGER;
    v_admin_id UUID;
BEGIN
    -- Notify about expiring memberships (3 days or less)
    FOR v_client IN SELECT c.id, c.name, c.mensalista_expires_at, mp.name as plan_name
    FROM clients c
    LEFT JOIN mensalista_plans mp ON mp.id = c.mensalista_plan_id
    WHERE c.is_mensalista = true
    AND c.mensalista_expires_at IS NOT NULL
    AND c.mensalista_expires_at <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date + 3
    AND c.mensalista_expires_at >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    LOOP
        v_days := v_client.mensalista_expires_at - (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

        IF v_days = 0 THEN
            v_title := 'Mensalidade vence hoje!';
            v_body := format('A mensalidade de %s (%s) vence hoje!', v_client.name, v_client.plan_name);
            v_tag := format('mensalidade-hoje-%s', v_client.id);
        ELSIF v_days = 1 THEN
            v_title := 'Mensalidade vence amanha!';
            v_body := format('A mensalidade de %s (%s) vence amanha!', v_client.name, v_client.plan_name);
            v_tag := format('mensalidade-alerta-%s', v_client.id);
        ELSE
            v_title := 'Mensalidade perto de vencer';
            v_body := format('A mensalidade de %s (%s) vence em %s dias!', v_client.name, v_client.plan_name, v_days);
            v_tag := format('mensalidade-alerta-%s', v_client.id);
        END IF;

        -- Create in-app notifications for all admins
        FOR v_admin_id IN SELECT user_id FROM admin_users LOOP
            INSERT INTO notifications (user_id, title, body, tag, url)
            VALUES (v_admin_id, v_title, v_body, v_tag, '/admin/clients');
        END LOOP;
    END LOOP;

    -- Auto-expire memberships that have passed
    UPDATE clients SET
        is_mensalista = false,
        mensalista_plan_id = NULL,
        mensalista_expires_at = NULL
    WHERE is_mensalista = true
    AND mensalista_expires_at IS NOT NULL
    AND mensalista_expires_at < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
END;
$$;

-- 9. CRON: verificar mensalistas diariamente as 8h
SELECT cron.schedule('verificar-mensalistas', '0 8 * * *', $$ SELECT verificar_mensalistas() $$);

-- 10. SETTING: mensalista_enabled = true (default)
INSERT INTO settings (key, value) VALUES ('mensalista_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Ao inves de marcar como 'completed', marca como 'cancelled' para bookings
-- do dia atual. Isso evita inflar faturamento com servicos que nao foram
-- realizados. O barbeiro tem 2h pra finalizar manualmente; se esquecer,
-- o booking eh cancelado (nao completado) pra nao mentir nos dados.

CREATE OR REPLACE FUNCTION completar_agendamentos_expirados()
RETURNS void AS $$
DECLARE v_agora_brt timestamp;
BEGIN
    v_agora_brt := NOW() AT TIME ZONE 'America/Sao_Paulo';

    -- Dias anteriores: marca como completed (cleanup de dias passados)
    UPDATE bookings SET status = 'completed'
    WHERE booking_date < v_agora_brt::date
      AND status IN ('confirmed', 'pending')
      AND is_blocked = FALSE;

    -- Hoje: marca como 'cancelled' apos 2h (nao sabemos se o cliente veio)
    -- O barbeiro ainda pode reverter manualmente no historico
    UPDATE bookings SET status = 'cancelled'
    WHERE booking_date = v_agora_brt::date
      AND status IN ('confirmed', 'pending')
      AND is_blocked = FALSE
      AND (booking_time + INTERVAL '2 hours') < v_agora_brt::time;

    -- Bloqueios de dias anteriores: limpa
    UPDATE bookings SET is_blocked = FALSE, status = 'cancelled'
    WHERE booking_date < v_agora_brt::date
      AND is_blocked = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 005_fixes.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 005 - FIXES
-- =========================================================================
-- Consolidado de: 009_remove_no_show_block.sql, 010_fix_rpc_functions.sql, 010_fix_notification_format.sql
-- =========================================================================

-- Ao inves de BLOQUEAR o cliente quando atinge o limite de faltas,
-- o sistema apenas NOTIFICA o barbeiro com um atalho pra chamar o
-- cliente no WhatsApp. O barbeiro decide se quer conversar ou nao.
-- Cliente bloqueado = cliente perdido. Melhor recuperar do que punir.

-- Remove o bloqueio na funcao de criacao de agendamento
CREATE OR REPLACE FUNCTION check_client_no_show_block(p_client_id uuid)
RETURNS void AS $$
BEGIN
    -- Nao bloqueia mais o cliente automaticamente.
    -- Apenas notifica o barbeiro via checkAndNotifyNoShowLimit (frontend).
    -- O barbeiro decide se quer conversar com o cliente no WhatsApp.
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Remove a funcao de verificacao de bloqueio (nao usada em mais nada)
CREATE OR REPLACE FUNCTION is_client_blocked_by_no_show(p_client_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Sempre retorna false — nao bloqueamos mais clientes por falta
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Corrige 3 bugs críticos:
-- 1. save_loyalty_milestones - não existia, quebrava o salvamento de metas
-- 2. increment_client_visits (plural) - frontend chamava plural mas só existia singular
-- 3. log_reminder_sent - não existia, quebrava o log de lembretes

-- 1. RPC: save_loyalty_milestones
-- Substitui atomicamente todas as milestones ativas pelas novas.
-- Recebe array de { visits_required, reward_service_id } e faz replace completo.
CREATE OR REPLACE FUNCTION save_loyalty_milestones(
    p_milestones JSONB
)
RETURNS void AS $$
DECLARE
    v_milestone JSONB;
    v_visits INTEGER;
    v_service_id UUID;
    v_existing_id UUID;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem gerenciar metas de fidelidade';
    END IF;

    -- Desativa todas as milestones existentes
    UPDATE loyalty_milestones SET is_active = false WHERE is_active = true;

    -- Itera sobre as novas milestones
    FOR v_milestone IN SELECT * FROM jsonb_array_elements(p_milestones)
    LOOP
        v_visits := (v_milestone->>'visits_required')::INTEGER;
        v_service_id := (v_milestone->>'reward_service_id')::UUID;

        -- Verifica se já existe uma milestone com essas visitas
        SELECT id INTO v_existing_id FROM loyalty_milestones
        WHERE visits_required = v_visits AND reward_service_id = v_service_id
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            -- Reativa a existente
            UPDATE loyalty_milestones SET is_active = true WHERE id = v_existing_id;
        ELSE
            -- Cria nova
            INSERT INTO loyalty_milestones (visits_required, reward_service_id, is_active)
            VALUES (v_visits, v_service_id, true);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: log_reminder_sent
-- Registra o envio de um lembrete na tabela reminder_logs.
CREATE OR REPLACE FUNCTION log_reminder_sent(
    p_client_id UUID,
    p_template_name TEXT DEFAULT NULL,
    p_message_preview TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Tenta obter o usuário autenticado
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    INSERT INTO reminder_logs (client_id, template_name, message_preview, user_id)
    VALUES (p_client_id, p_template_name, p_message_preview, v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: increment_client_visits (alias - plural)
-- O frontend chama 'increment_client_visits' (plural).
-- O backend já tem 'increment_client_visit' (singular).
-- Este alias garante compatibilidade sem precisar alterar o frontend.
CREATE OR REPLACE FUNCTION increment_client_visits(p_client_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_visits INTEGER;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    UPDATE clients SET historical_visits = COALESCE(historical_visits, 0) + 1
    WHERE id = p_client_id
    RETURNING COALESCE(historical_visits, 0) INTO v_visits;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente nao encontrado.';
    END IF;

    RETURN v_visits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Converte notificações no formato pipe-separado (legado) para o formato
-- JSON padronizado. Também padroniza os títulos "Novo Agendamento! 💈"
-- para "Novo Agendamento!" e "Agendamento Cancelado ❌" para 
-- "Agendamento Cancelado".

-- Função auxiliar: converte body pipe-separado para JSON
CREATE OR REPLACE FUNCTION _convert_notification_body_to_json()
RETURNS void AS $$
DECLARE
    v_notif RECORD;
    v_parts text[];
    v_client_name text;
    v_services text;
    v_date_time text;
    v_total_price text;
    v_client_phone text;
    v_manage_url text;
    v_json_body text;
    v_count integer := 0;
BEGIN
    -- Busca notificações com body no formato pipe-separado (não JSON)
    FOR v_notif IN 
        SELECT id, title, body, tag 
        FROM notifications 
        WHERE body NOT LIKE '{%'  -- não começa com { (não é JSON)
          AND body NOT LIKE 'Se você vê%'  -- não é teste
    LOOP
        BEGIN
            -- Tenta fazer o parse do body antigo
            -- Formato antigo: "Nome | Serviços | Data às Hora | R$ XX,XX | Telefone | URL"
            v_parts := string_to_array(v_notif.body, ' | ');
            
            IF array_length(v_parts, 1) >= 6 THEN
                v_client_name := trim(v_parts[1]);
                v_services := trim(v_parts[2]);
                v_date_time := trim(v_parts[3]);
                v_total_price := trim(v_parts[4]);
                v_client_phone := trim(v_parts[5]);
                v_manage_url := trim(v_parts[6]);
                
                -- Se for cancelamento, a URL é "Cancelado"
                -- Se for agendamento novo, a URL é um link
                
                -- Constrói o JSON
                v_json_body := jsonb_build_object(
                    'clientName', v_client_name,
                    'services', v_services,
                    'dateTime', v_date_time,
                    'totalPrice', v_total_price,
                    'clientPhone', v_client_phone,
                    'manageUrl', v_manage_url,
                    'isMensalista', false
                )::text;
                
                -- Padroniza o título (remove emojis antigos)
                UPDATE notifications 
                SET body = v_json_body,
                    title = CASE 
                        WHEN title LIKE 'Novo Agendamento%' THEN 'Novo Agendamento!'
                        WHEN title LIKE 'Agendamento Cancelado%' THEN 'Agendamento Cancelado'
                        ELSE title
                    END
                WHERE id = v_notif.id;
                
                v_count := v_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Se falhar, pula essa notificação
            NULL;
        END;
    END LOOP;
    
    RAISE NOTICE 'Convertidas % notificações para formato JSON.', v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executa a conversão
SELECT _convert_notification_body_to_json();

-- Remove a função auxiliar (não precisa mais)
DROP FUNCTION IF EXISTS _convert_notification_body_to_json();

-- >>> MIGRATION: 004_subscriptions_pix.sql <<<

-- =========================================================================
-- BLACK DIAMOND - 004 - ASSINATURAS PIX + BLOQUEIO
-- =========================================================================
-- Consolidado de: 006_subscriptions_pix.sql, 007_fix_agendamento.sql
-- Subscriptions, payment_logs, payment_blocked_users, check_login_allowed, PIX e fix do agendamento.
-- =========================================================================


-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 006_subscriptions_pix.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 006 - ASSINATURAS + PIX + BLOQUEIO
-- =========================================================================
-- Consolidado de: 006_subscriptions.sql, 007_monthly_subscriptions.sql,
--                 008_pix_setup.sql, 011_payment_blocked_users.sql
-- =========================================================================

----------------------------------------------------------------------
-- PARTE 1: TABELAS DE ASSINATURA
----------------------------------------------------------------------

-- 1.1 TABELA subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('active', 'pending', 'expired', 'cancelled')),
    current_period_start DATE,
    current_period_end DATE,
    grace_period_end DATE,
    asaas_customer_id TEXT,
    asaas_payment_id TEXT,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 TABELA payment_logs
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    asaas_payment_id TEXT,
    amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'overdue', 'refunded', 'cancelled')),
    payment_method TEXT,
    pix_qr_code TEXT,
    pix_payload TEXT,
    payment_link TEXT,
    paid_at TIMESTAMPTZ,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 INDEXES
CREATE INDEX IF NOT EXISTS idx_subscriptions_barber_id ON subscriptions(barber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_per_barber
    ON subscriptions(barber_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(current_period_end)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_payment_logs_subscription ON payment_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_barber ON payment_logs(barber_id);

-- 1.4 RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscriptions: admins full" ON subscriptions;
CREATE POLICY "Subscriptions: admins full" ON subscriptions
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Subscriptions: barber view own" ON subscriptions;
CREATE POLICY "Subscriptions: barber view own" ON subscriptions
    FOR SELECT TO authenticated
    USING (
        barber_id IN (
            SELECT id FROM barbers WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Payment logs: admins full" ON payment_logs;
CREATE POLICY "Payment logs: admins full" ON payment_logs
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Payment logs: barber view own" ON payment_logs;
CREATE POLICY "Payment logs: barber view own" ON payment_logs
    FOR SELECT TO authenticated
    USING (
        barber_id IN (
            SELECT id FROM barbers WHERE user_id = auth.uid()
        )
    );

----------------------------------------------------------------------
-- PARTE 2: FUNÇÕES DE ASSINATURA (VERSÃO FINAL - MENSAL CALENDÁRIO)
----------------------------------------------------------------------

-- 2.1 update_subscription_paid (versão mensal calendário)
CREATE OR REPLACE FUNCTION update_subscription_paid(
    p_barber_id UUID,
    p_asaas_payment_id TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_sub_id UUID;
    v_last_day_current DATE;
    v_new_end DATE;
    v_result jsonb;
BEGIN
    SELECT id INTO v_sub_id FROM subscriptions
    WHERE barber_id = p_barber_id AND status = 'pending'
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO subscriptions (barber_id, status)
        VALUES (p_barber_id, 'pending')
        RETURNING id INTO v_sub_id;
    END IF;

    v_last_day_current := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

    -- REGRA: se pagou no último dia do mês → leva o mês INTEIRO seguinte
    IF CURRENT_DATE >= v_last_day_current THEN
        v_new_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months - 1 day')::DATE;
    ELSE
        v_new_end := v_last_day_current;
    END IF;

    UPDATE subscriptions SET
        status = 'active',
        current_period_start = CURRENT_DATE,
        current_period_end = v_new_end,
        grace_period_end = v_new_end,
        asaas_payment_id = COALESCE(p_asaas_payment_id, asaas_payment_id),
        updated_at = NOW()
    WHERE id = v_sub_id;

    INSERT INTO payment_logs (subscription_id, barber_id, asaas_payment_id, amount, status, payment_method, paid_at, due_date)
    VALUES (v_sub_id, p_barber_id, p_asaas_payment_id, 50.00, 'confirmed', p_payment_method, NOW(), v_new_end);

    RETURN jsonb_build_object('success', true, 'subscription_id', v_sub_id, 'new_expiry', v_new_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 check_subscription_status (versão final)
CREATE OR REPLACE FUNCTION check_subscription_status(p_barber_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_sub RECORD;
    v_is_active BOOLEAN;
    v_status TEXT;
    v_days_remaining INTEGER;
    v_is_blocked BOOLEAN;
BEGIN
    SELECT * INTO v_sub FROM subscriptions
    WHERE barber_id = p_barber_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'has_subscription', false,
            'is_active', true,
            'status', 'none',
            'days_remaining', 999,
            'is_blocked', false,
            'current_period_end', NULL::TEXT
        );
    END IF;

    v_is_active := v_sub.status = 'active'
                   AND v_sub.current_period_end IS NOT NULL
                   AND v_sub.current_period_end >= CURRENT_DATE;

    IF v_sub.status = 'active' AND (v_sub.current_period_end IS NULL OR v_sub.current_period_end < CURRENT_DATE) THEN
        v_status := 'expired';
    ELSE
        v_status := v_sub.status;
    END IF;

    v_days_remaining := CASE
        WHEN v_sub.current_period_end IS NULL THEN 0
        ELSE GREATEST(0, v_sub.current_period_end - CURRENT_DATE)
    END;

    v_is_blocked := NOT (v_sub.status = 'active' AND v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end >= CURRENT_DATE);

    RETURN jsonb_build_object(
        'has_subscription', true,
        'is_active', v_is_active,
        'status', v_status,
        'current_period_start', v_sub.current_period_start,
        'current_period_end', v_sub.current_period_end,
        'grace_period_end', v_sub.grace_period_end,
        'days_remaining', v_days_remaining,
        'is_blocked', v_is_blocked
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2.3 get_payment_history
CREATE OR REPLACE FUNCTION get_payment_history(p_barber_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', pl.id,
            'amount', pl.amount,
            'status', pl.status,
            'payment_method', pl.payment_method,
            'paid_at', pl.paid_at,
            'due_date', pl.due_date,
            'created_at', pl.created_at
        ) ORDER BY pl.created_at DESC
    ) INTO v_result
    FROM payment_logs pl
    WHERE pl.barber_id = p_barber_id;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2.4 auto_create_subscription (versão final - trial até fim do mês)
CREATE OR REPLACE FUNCTION auto_create_subscription()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT NEW.is_owner AND NOT EXISTS (
        SELECT 1 FROM subscriptions WHERE barber_id = NEW.id
    ) THEN
        INSERT INTO subscriptions (barber_id, status, grace_period_end)
        VALUES (
            NEW.id,
            'pending',
            (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_subscription ON barbers;
CREATE TRIGGER trg_auto_create_subscription
AFTER INSERT ON barbers
FOR EACH ROW
EXECUTE FUNCTION auto_create_subscription();

----------------------------------------------------------------------
-- PARTE 3: PIX SETUP + MIGRAÇÃO
----------------------------------------------------------------------

-- 3.1 Chave PIX e email do proprietário
INSERT INTO settings (key, value)
VALUES ('owner_pix_key', '70263397610')
ON CONFLICT (key) DO UPDATE SET value = '70263397610';

INSERT INTO settings (key, value)
VALUES ('owner_email', 'elberthmayan2007@gmail.com')
ON CONFLICT (key) DO NOTHING;

-- 3.2 Cria subscriptions ativas para barbeiros existentes não-owners
INSERT INTO subscriptions (barber_id, status, current_period_start, current_period_end)
SELECT
  b.id,
  'active',
  CURRENT_DATE,
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
FROM barbers b
WHERE b.is_owner = FALSE
AND NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.barber_id = b.id
);

----------------------------------------------------------------------
-- PARTE 4: BLOQUEIO POR PAGAMENTO (SERVER-SIDE)
----------------------------------------------------------------------

-- 4.1 Tabela de usuários bloqueados
CREATE TABLE IF NOT EXISTS payment_blocked_users (
    email TEXT PRIMARY KEY,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT DEFAULT 'payment_missing',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_blocked_users_email ON payment_blocked_users(email);
ALTER TABLE payment_blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage payment_blocked_users" ON payment_blocked_users;
CREATE POLICY "Admin manage payment_blocked_users"
    ON payment_blocked_users FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- 4.2 Função de verificação de login
-- Lê o email do proprietário da tabela settings (não hardcoded)
CREATE OR REPLACE FUNCTION check_login_allowed(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_blocked RECORD;
    v_owner_email TEXT;
BEGIN
    -- Busca email do proprietário da settings (configurável sem editar SQL)
    SELECT COALESCE(value, 'elberthmayan2007@gmail.com') INTO v_owner_email
    FROM settings WHERE key = 'owner_email';

    -- Owner sempre pode logar
    IF LOWER(TRIM(p_email)) = LOWER(TRIM(v_owner_email)) THEN
        RETURN jsonb_build_object('allowed', true, 'reason', null);
    END IF;

    -- Verifica se o email está na lista de bloqueados
    SELECT * INTO v_blocked
    FROM payment_blocked_users
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', '❌ Conta bloqueada por falta de pagamento. ' ||
                      'Entre em contato com o administrador para regularizar a mensalidade de R$ 50,00. ' ||
                      'Após a confirmação, você poderá acessar normalmente.'
        );
    END IF;

    RETURN jsonb_build_object('allowed', true, 'reason', null);
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 007_fix_agendamento.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 007 - FIX: AGENDAMENTO + WRAPPER
-- =========================================================================
-- Consolidado de: 009_fix_criar_agendamento.sql, 010_wrapper_criar_agendamento.sql
-- =========================================================================

-- Dropar versões antigas (se existirem)
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text);
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric);

-- Função principal com rate limiting e no-show check
-- Frontend chama com named params (Supabase RPC), entao p_discount_amount
-- e recebido mas NAO usado para calcular desconto (calculo 100% server-side
-- dentro de criar_agendamento). Mantido apenas para compatibilidade.
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

-- Permissão para a versão com parâmetros nomeados (frontend)
GRANT EXECUTE ON FUNCTION criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric, uuid) TO anon, authenticated;

-- Wrapper removido: a versão acima com named params já cobre todos os casos.
-- A wrapper duplicada com ordem invertida de parâmetros (barber_id primeiro)
-- causava ambiguidade na resolução de named parameters pelo Supabase RPC.
DROP FUNCTION IF EXISTS public.criar_agendamento_rate_limited(uuid, text, text, text, uuid, date, numeric, integer, time, numeric, uuid[]);

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
-- DOCUMENTACAO: Tabelas expenses e recurring_expenses
-- =========================================================================
-- Estas tabelas existem no banco de producao (criadas manualmente no SQL Editor)
-- mas nao possuem migration correspondente. Mantidas para compatibilidade.
-- Caso nao sejam mais uteis, podem ser dropadas com:
--   DROP TABLE IF EXISTS expenses CASCADE;
--   DROP TABLE IF EXISTS recurring_expenses CASCADE;
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
