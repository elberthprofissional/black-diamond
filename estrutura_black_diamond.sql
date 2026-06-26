-- =========================================================================
-- BLACK DIAMOND - SCHEMA COMPLETO (SUPABASE / POSTGRESQL)
-- =========================================================================
-- Cole todo este código no SQL Editor do Supabase e clique em RUN.
-- Este arquivo contém TUDO: tabelas, funções, políticas, triggers, crons.

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

-- Insere a chave Resend (substitua pelo valor real no Supabase)
INSERT INTO secrets (key, value) VALUES ('resend_api_key', 'SUA_CHAVE_RESEND_AQUI')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

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

-- =========================================================================
-- 3. CONFIGURAÇÕES PADRÃO
-- =========================================================================
-- Seg-sex: 08:30-19:00 / Sábado: 08:00-18:00 / Sem almoço

INSERT INTO settings (key, value) VALUES
    ('opening_time', '08:30'),
    ('closing_time', '19:00'),
    ('saturday_opening', '08:00'),
    ('saturday_closing', '18:00'),
    ('working_days', '1,2,3,4,5,6'),
    ('admin_email', 'elberthmayan2007@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- =========================================================================
-- 4. INDEX E VIEWS
-- =========================================================================

-- Impedir duplo agendamento
DROP INDEX IF EXISTS idx_no_double_booking;
CREATE UNIQUE INDEX idx_no_double_booking
ON bookings (booking_date, booking_time)
WHERE (status != 'cancelled');

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
-- 6. FUNÇÃO HELPER: Verifica se o usuário é admin
-- =========================================================================
-- O email do admin é armazenado na tabela 'settings', não hardcoded nas policies.
-- Para trocar o admin, basta atualizar: UPDATE settings SET value = 'novo@email.com' WHERE key = 'admin_email';

DROP FUNCTION IF EXISTS is_admin();
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM settings
    WHERE key = 'admin_email'
    AND value = (auth.jwt() ->> 'email')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =========================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =========================================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 8. POLÍTICAS DE ACESSO (usando is_admin() - sem email hardcoded)
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

-- Agendamentos: apenas admin
DROP POLICY IF EXISTS "Agendamentos gerenciamento admin" ON bookings;
CREATE POLICY "Agendamentos gerenciamento admin" ON bookings FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Configurações: leitura pública, escrita admin
DROP POLICY IF EXISTS "Configurações leitura pública" ON settings;
CREATE POLICY "Configurações leitura pública" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Configurações gerenciamento admin" ON settings;
CREATE POLICY "Configurações gerenciamento admin" ON settings FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Push subscriptions: apenas admin
DROP POLICY IF EXISTS "Push subscriptions admin" ON push_subscriptions;
CREATE POLICY "Push subscriptions admin" ON push_subscriptions FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- =========================================================================
-- 9. FUNÇÕES RPC (SECURITY DEFINER)
-- =========================================================================

-- Criar agendamento (com email)
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
BEGIN
    SELECT COUNT(*) INTO v_daily_bookings
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_cliente_telefone
    AND b.booking_date = p_data
    AND b.status != 'cancelled';

    IF v_daily_bookings >= 3 THEN
        RAISE EXCEPTION 'Limite de 3 agendamentos por dia atingido.';
    END IF;

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

-- Slots disponíveis (sem almoço, 1 hora)
CREATE OR REPLACE FUNCTION get_available_slots(p_date date)
RETURNS TABLE(slot_time text) AS $$
DECLARE
    v_opening time;
    v_closing time;
    v_current time;
    v_day_of_week integer;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_date);

    IF v_day_of_week = 6 THEN
        v_opening := COALESCE((SELECT value::time FROM settings WHERE key = 'saturday_opening'), '08:00'::time);
        v_closing := COALESCE((SELECT value::time FROM settings WHERE key = 'saturday_closing'), '18:00'::time);
    ELSE
        v_opening := COALESCE((SELECT value::time FROM settings WHERE key = 'opening_time'), '08:30'::time);
        v_closing := COALESCE((SELECT value::time FROM settings WHERE key = 'closing_time'), '19:00'::time);
    END IF;

    v_current := v_opening;
    WHILE v_current < v_closing LOOP
        IF NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.booking_date = p_date
            AND b.booking_time = v_current
            AND b.status != 'cancelled'
        ) THEN
            slot_time := v_current::text;
            RETURN NEXT;
        END IF;
        v_current := v_current + interval '1 hour';
    END LOOP;
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

-- Configurações do negócio
CREATE OR REPLACE FUNCTION get_business_hours()
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_object_agg(key, value) INTO v_result FROM settings;
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bloquear/desbloquear horário
CREATE OR REPLACE FUNCTION toggle_slot_block(p_date date, p_time time)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
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
        SELECT id INTO v_client_id FROM clients WHERE phone = '00000000000' LIMIT 1;
        IF v_client_id IS NULL THEN
            INSERT INTO clients (name, phone) VALUES ('BLOQUEADO', '00000000000') RETURNING id INTO v_client_id;
        END IF;

        INSERT INTO bookings (client_id, service_ids, booking_date, booking_time, total_price, total_duration, status, is_blocked)
        VALUES (v_client_id, '{}', p_date, p_time, 0, 0, 'confirmed', true)
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
    INSERT INTO push_subscriptions (endpoint, p256dh, auth)
    VALUES (p_endpoint, p_p256dh, p_auth)
    ON CONFLICT (endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 10. EMAIL: CONFIRMAÇÃO IMEDIATA
-- =========================================================================

CREATE OR REPLACE FUNCTION enviar_email_confirmacao_imediata()
RETURNS trigger AS $$
DECLARE
    v_client_email text;
    v_client_name text;
    v_date_formatted text;
    v_time_formatted text;
    v_price_formatted text;
    v_html_body text;
    v_payload text;
    v_resend_key text;
BEGIN
    v_resend_key := (SELECT value FROM secrets WHERE key = 'resend_api_key');

    SELECT email, name INTO v_client_email, v_client_name
    FROM clients
    WHERE id = NEW.client_id;

    IF v_client_email IS NOT NULL AND v_client_email != '' AND v_client_email LIKE '%@%' THEN
        v_date_formatted := to_char(NEW.booking_date, 'DD/MM/YYYY');
        v_time_formatted := substring(NEW.booking_time::text from 1 for 5);
        v_price_formatted := NEW.total_price::integer::text;

        v_html_body := '
          <div style="font-family: sans-serif; background-color: #0A0A0A; color: #FFFFFF; padding: 30px; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid #C5A059;">
            <h2 style="color: #C5A059; border-bottom: 1px solid #222; padding-bottom: 15px; text-transform: uppercase; text-align: center; margin-top: 0; font-size: 18px; font-weight: bold; letter-spacing: 1px;">Tudo certo, ' || split_part(v_client_name, ' ', 1) || '! 💈</h2>
            <p style="font-size: 13px; line-height: 1.6; color: #d4d4d8; text-align: left;">Fala, ' || split_part(v_client_name, ' ', 1) || '! Beleza? Passando para avisar que seu horário na <strong>Black Diamond</strong> já está reservado e confirmado!</p>
            <div style="background-color: #111; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #333; color: #FFFFFF;">
              <p style="margin: 6px 0; font-size: 13px;">📅 <strong>Data:</strong> ' || v_date_formatted || '</p>
              <p style="margin: 6px 0; font-size: 13px;">⏰ <strong>Horário:</strong> ' || v_time_formatted || 'h</p>
              <p style="margin: 6px 0; font-size: 13px;">💰 <strong>Valor:</strong> R$ ' || v_price_formatted || '</p>
            </div>
            <div style="font-size: 12px; color: #a1a1aa; line-height: 1.5; border-top: 1px solid #222; padding-top: 15px; margin-top: 15px; text-align: left;">
              📍 <strong>Endereço Black Diamond:</strong><br />
              Av. Brasílio da Gama, 139 - Bairro Tupi, BH<br />
              <a href="https://maps.app.goo.gl/Gz453umZQtWGYcvV8" target="_blank" style="color: #C5A059; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 5px;">→ Como chegar no Google Maps</a>
            </div>
            <p style="font-size: 12px; color: #71717a; text-align: center; margin-top: 25px; line-height: 1.5;">Qualquer imprevisto ou se precisar reagendar, só entrar em contato com a gente.</p>
          </div>
        ';

        v_payload := jsonb_build_object(
                'from', 'Black Diamond <elberthmayan2007@gmail.com>',
                'to', ARRAY[v_client_email],
                'subject', 'Horário Confirmado - Black Diamond Barber',
            'html', v_html_body
        )::text;

        BEGIN
            PERFORM status FROM http((
                'POST',
                'https://api.resend.com/emails',
                ARRAY[
                    http_header('Authorization', 'Bearer ' || v_resend_key),
                    http_header('Content-Type', 'application/json')
                ],
                'application/json',
                v_payload
            )::http_request);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enviar_email_confirmacao ON bookings;
CREATE TRIGGER trigger_enviar_email_confirmacao
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION enviar_email_confirmacao_imediata();

-- =========================================================================
-- 11. LEMBRETE 30 MINUTOS ANTES
-- =========================================================================

CREATE OR REPLACE FUNCTION enviar_lembretes_30_minutos()
RETURNS void AS $$
DECLARE
    v_booking record;
    v_client_email text;
    v_client_name text;
    v_time_formatted text;
    v_html_body text;
    v_payload text;
    v_resend_key text;
    v_current_local_time time;
    v_current_local_date date;
BEGIN
    v_resend_key := (SELECT value FROM secrets WHERE key = 'resend_api_key');

    v_current_local_date := (now() at time zone 'America/Sao_Paulo')::date;
    v_current_local_time := (now() at time zone 'America/Sao_Paulo')::time;

    FOR v_booking IN
        SELECT b.id, b.client_id, b.booking_time, b.total_price
        FROM bookings b
        WHERE b.booking_date = v_current_local_date
        AND b.status = 'confirmed'
        AND b.reminder_sent = false
        AND b.booking_time >= v_current_local_time + interval '25 minutes'
        AND b.booking_time <= v_current_local_time + interval '35 minutes'
    LOOP
        SELECT email, name INTO v_client_email, v_client_name
        FROM clients
        WHERE id = v_booking.client_id;

        IF v_client_email IS NOT NULL AND v_client_email != '' AND v_client_email LIKE '%@%' THEN
            v_time_formatted := substring(v_booking.booking_time::text from 1 for 5);

            v_html_body := '
              <div style="font-family: sans-serif; background-color: #0A0A0A; color: #FFFFFF; padding: 30px; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid #C5A059;">
                <h2 style="color: #C5A059; border-bottom: 1px solid #222; padding-bottom: 15px; text-transform: uppercase; text-align: center; margin-top: 0; font-size: 18px; font-weight: bold; letter-spacing: 1px;">Seu horário tá chegando! 💈</h2>
                <p style="font-size: 13px; line-height: 1.6; color: #d4d4d8; text-align: left;">Fala, ' || split_part(v_client_name, ' ', 1) || '! Beleza? Passando para te lembrar que você tem um agendamento hoje com a gente.</p>
                <div style="background-color: #111; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #333; color: #FFFFFF; text-align: center;">
                  <p style="margin: 5px 0; font-size: 15px;">⏰ <strong>Te esperamos às ' || v_time_formatted || 'h</strong></p>
                </div>
                <div style="font-size: 12px; color: #a1a1aa; line-height: 1.5; border-top: 1px solid #222; padding-top: 15px; margin-top: 15px; text-align: left;">
                  📍 <strong>Endereço Black Diamond:</strong><br />
                  Av. Brasílio da Gama, 139 - Bairro Tupi, BH<br />
                  <a href="https://maps.app.goo.gl/Gz453umZQtWGYcvV8" target="_blank" style="color: #C5A059; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 5px;">→ Como chegar no Google Maps</a>
                </div>
              </div>
            ';

            v_payload := jsonb_build_object(
                'from', 'Black Diamond <elberthmayan2007@gmail.com>',
                'to', ARRAY[v_client_email],
                'subject', 'Lembrete de Agendamento - Black Diamond Barber',
                'html', v_html_body
            )::text;

            BEGIN
                PERFORM status FROM http((
                    'POST',
                    'https://api.resend.com/emails',
                    ARRAY[
                        http_header('Authorization', 'Bearer ' || v_resend_key),
                        http_header('Content-Type', 'application/json')
                    ],
                    'application/json',
                    v_payload
                )::http_request);

                UPDATE bookings SET reminder_sent = true WHERE id = v_booking.id;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        ELSE
            UPDATE bookings SET reminder_sent = true WHERE id = v_booking.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 12. RESET SEMANAL AUTOMÁTICO
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

    DELETE FROM bookings
    WHERE is_blocked = TRUE
    AND booking_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 13. CRON JOBS
-- =========================================================================

-- Lembrete: a cada 5 minutos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enviar-lembretes-30minutos') THEN
        PERFORM cron.unschedule('enviar-lembretes-30minutos');
    END IF;
END $$;

SELECT cron.schedule(
    'enviar-lembretes-30minutos',
    '*/5 * * * *',
    $$ SELECT enviar_lembretes_30_minutos() $$
);

-- Reset semanal: todo sábado às 19:00 horário de Brasília (depois do fechamento)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-semana') THEN
        PERFORM cron.unschedule('limpar-semana');
    END IF;
END $$;

SELECT cron.schedule(
    'limpar-semana',
    '0 22 * * 6', -- 22:00 UTC = 19:00 horário de Brasília
    $$ SELECT limpar_agendamentos_semana() $$
);

-- =========================================================================
-- 14. PUSH NOTIFICATIONS: DELETE SUBSCRIPTION
-- =========================================================================

CREATE OR REPLACE FUNCTION delete_push_subscription(p_endpoint text)
RETURNS void AS $$
BEGIN
    DELETE FROM push_subscriptions WHERE endpoint = p_endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 15. PUSH NOTIFICATIONS: TRIGGER NOVO AGENDAMENTO
-- =========================================================================

CREATE OR REPLACE FUNCTION notificar_push_agendamento()
RETURNS trigger AS $$
DECLARE
    v_client_name text;
    v_service_names text;
    v_date_formatted text;
    v_time_formatted text;
    v_payload text;
    v_supabase_url text;
    v_service_role_key text;
BEGIN
    IF NEW.is_blocked = TRUE THEN
        RETURN NEW;
    END IF;

    SELECT c.name INTO v_client_name FROM clients c WHERE c.id = NEW.client_id;

    SELECT string_agg(s.name, ', ') INTO v_service_names
    FROM services s
    WHERE s.id = ANY(NEW.service_ids);

    v_date_formatted := to_char(NEW.booking_date, 'DD/MM/YYYY');
    v_time_formatted := substring(NEW.booking_time::text from 1 for 5);

    v_supabase_url := (SELECT value FROM secrets WHERE key = 'supabase_url');
    v_service_role_key := (SELECT value FROM secrets WHERE key = 'supabase_service_role_key');

    IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
        RETURN NEW;
    END IF;

    v_payload := jsonb_build_object(
        'booking_id', NEW.id,
        'client_name', COALESCE(v_client_name, 'Cliente'),
        'service_names', COALESCE(v_service_names, 'Serviço'),
        'booking_date', v_date_formatted,
        'booking_time', v_time_formatted
    )::text;

    BEGIN
        PERFORM status FROM http((
            'POST',
            v_supabase_url || '/functions/v1/send-push',
            ARRAY[
                http_header('Authorization', 'Bearer ' || v_service_role_key),
                http_header('Content-Type', 'application/json')
            ],
            'application/json',
            v_payload
        )::http_request);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_push_agendamento ON bookings;
CREATE TRIGGER trigger_notificar_push_agendamento
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION notificar_push_agendamento();

-- =========================================================================
-- 16. PUSH NOTIFICATIONS: CLEANUP SUBSCRIPTIONS ANTIGAS
-- =========================================================================

CREATE OR REPLACE FUNCTION limpar_subscriptions_antigas()
RETURNS void AS $$
BEGIN
    DELETE FROM push_subscriptions
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-push-subscriptions') THEN
        PERFORM cron.unschedule('limpar-push-subscriptions');
    END IF;
END $$;

SELECT cron.schedule(
    'limpar-push-subscriptions',
    '0 3 * * *',
    $$ SELECT limpar_subscriptions_antigas() $$
);

-- =========================================================================
-- 17. SECRETS DO SUPABASE (para a edge function)
-- =========================================================================
-- IMPORTANTE: Insira os secrets abaixo via SQL Editor OU pelo painel:
-- Project Settings → Edge Functions → Secrets
--
-- Chaves necessárias:
--   VAPID_PRIVATE_KEY = <chave_privada_vapid>
--   VAPID_PUBLIC_KEY  = <chave_publica_vapid>
--   VAPID_SUBJECT     = mailto:elberthmayan2007@gmail.com
--
-- Alternativamente, insira no banco (secrets table):
INSERT INTO secrets (key, value) VALUES
    ('supabase_url', 'https://dbukdhycfaibdshxnatt.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- O service_role_key NÃO deve ser armazenado no banco por segurança.
-- Configure-o via: Project Settings → Edge Functions → Secrets
-- Nome: SUPABASE_SERVICE_ROLE_KEY

-- =========================================================================
-- 18. CRIAR USUÁRIO ADMIN
-- =========================================================================
-- IMPORTANTE: Não crie via SQL. Use o painel do Supabase:
-- 1. Authentication → Users → Add user
-- 2. Email: elberthmayan2007@gmail.com
-- 3. Defina uma senha

-- =========================================================================
-- 19. SISTEMA DE AVALIAÇÃO
-- =========================================================================

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews leitura pública" ON reviews;
CREATE POLICY "Reviews leitura pública" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Reviews inserção pública" ON reviews;
CREATE POLICY "Reviews inserção pública" ON reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Reviews admin gerencia" ON reviews;
CREATE POLICY "Reviews admin gerencia" ON reviews FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    SELECT r.id, c.name, r.rating, r.comment, r.created_at
    FROM reviews r
    JOIN clients c ON c.id = r.client_id
    WHERE r.rating >= 4
    ORDER BY r.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 20. AVALIAÇÃO: EMAIL PÓS-ATENDIMENTO
-- =========================================================================

CREATE OR REPLACE FUNCTION enviar_email_avaliacao()
RETURNS trigger AS $$
DECLARE
    v_client_email text;
    v_client_name text;
    v_html_body text;
    v_payload text;
    v_resend_key text;
BEGIN
    IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
        RETURN NEW;
    END IF;

    v_resend_key := (SELECT value FROM secrets WHERE key = 'resend_api_key');

    SELECT email, name INTO v_client_email, v_client_name
    FROM clients WHERE id = NEW.client_id;

    IF v_client_email IS NULL OR v_client_email = '' OR v_client_email NOT LIKE '%@%' THEN
        RETURN NEW;
    END IF;

    v_html_body := '
      <div style="font-family: sans-serif; background-color: #0A0A0A; color: #FFFFFF; padding: 30px; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid #C5A059;">
        <h2 style="color: #C5A059; border-bottom: 1px solid #222; padding-bottom: 15px; text-transform: uppercase; text-align: center; margin-top: 0; font-size: 18px; font-weight: bold; letter-spacing: 1px;">Como foi seu atendimento? 💈</h2>
        <p style="font-size: 13px; line-height: 1.6; color: #d4d4d8; text-align: left;">Fala, ' || split_part(v_client_name, ' ', 1) || '! Passando para saber como foi sua experiência no Black Diamond. Sua opinião é muito importante pra gente!</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="https://dbukdhycfaibdshxnatt.supabase.co/avaliar/' || NEW.id || '" style="display: inline-block; background-color: #C5A059; color: #0A0A0A; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">AVALIAR ATENDIMENTO</a>
        </div>
        <p style="font-size: 12px; color: #71717a; text-align: center; margin-top: 25px;">Obrigado pela preferência!</p>
      </div>';

    v_payload := jsonb_build_object(
        'from', 'Black Diamond <elberthmayan2007@gmail.com>',
        'to', ARRAY[v_client_email],
        'subject', 'Como foi seu atendimento? - Black Diamond',
        'html', v_html_body
    )::text;

    BEGIN
        PERFORM status FROM http((
            'POST',
            'https://api.resend.com/emails',
            ARRAY[
                http_header('Authorization', 'Bearer ' || v_resend_key),
                http_header('Content-Type', 'application/json')
            ],
            'application/json',
            v_payload
        )::http_request);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enviar_email_avaliacao ON bookings;
CREATE TRIGGER trigger_enviar_email_avaliacao
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION enviar_email_avaliacao();

-- =========================================================================
-- 21. GOOGLE CALENDAR: COLUNA NA TABELA BOOKINGS
-- =========================================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- =========================================================================
-- PRONTO! Tudo configurado.
-- =========================================================================
