-- =========================================================================
-- MIGRATION: Security fixes, performance indexes, and bug fixes
-- Date: 2026-07-05
-- =========================================================================

-- 1. PERFORMANCE: Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status);

-- 2. SECURITY: Fix audit_logs INSERT policy (was allowing any authenticated user)
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- 3. SECURITY: Fix audit_logs SELECT policy (was using fragile JWT check)
DROP POLICY IF EXISTS "Admin can read audit logs" ON audit_logs;
CREATE POLICY "Admin can read audit logs" ON audit_logs
    FOR SELECT
    TO authenticated
    USING (is_admin());

-- 4. SECURITY: Fix gallery_images policy to use is_admin()
DROP POLICY IF EXISTS "Admin can manage gallery" ON gallery_images;
CREATE POLICY "Admin can manage gallery" ON gallery_images
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- 5. SECURITY: Fix secrets RLS to block all roles (not just authenticated)
DROP POLICY IF EXISTS "Secrets no access" ON secrets;
CREATE POLICY "Secrets no access" ON secrets
    FOR ALL
    USING (false)
    WITH CHECK (false);

-- 6. SECURITY: Server-side price calculation in criar_agendamento
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

    -- Server-side price and duration calculation
    SELECT COALESCE(SUM(price), 0), COALESCE(SUM(duration), 0)
    INTO v_server_price, v_server_duration
    FROM services WHERE id = ANY(p_servicos);

    IF v_server_price = 0 AND array_length(p_servicos, 1) > 0 THEN
        RAISE EXCEPTION 'Serviço(s) inválido(s).';
    END IF;

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

-- 7. PRIVACY: Mask client names in public reviews (LGPD compliance)
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

-- 8. FIX: Remove dead DELETE in limpar_agendamentos_semana
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

-- 9. SECURITY: Restrict get_business_hours to public settings only
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
