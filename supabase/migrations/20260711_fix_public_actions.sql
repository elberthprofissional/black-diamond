-- =========================================================================
-- Migration: Public Actions — RPCs para acesso público
-- =========================================================================
-- Adiciona funções RPC que permitem ao público:
--   - Buscar cliente por telefone (lookup_client_by_phone)
--   - Buscar último agendamento (get_last_booking_by_phone)
--   - Buscar agendamentos futuros por telefone (get_bookings_by_phone)
--   - Cancelar agendamento com token (cancel_booking_public)
-- =========================================================================

-- RPC para buscar cliente por telefone (seguro, sem expor dados sensíveis)
CREATE OR REPLACE FUNCTION lookup_client_by_phone(p_phone text)
RETURNS TABLE(
    id UUID,
    name TEXT,
    phone TEXT,
    is_mensalista BOOLEAN,
    mensalista_plan_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.is_mensalista, c.mensalista_plan_id
    FROM clients c
    WHERE c.phone = p_phone
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para buscar último agendamento do cliente
CREATE OR REPLACE FUNCTION get_last_booking_by_phone(p_phone text)
RETURNS TABLE(
    service_ids UUID[],
    total_price DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT b.service_ids, b.total_price
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    WHERE c.phone = p_phone
    AND b.status IN ('pending', 'confirmed', 'completed')
    ORDER BY b.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para buscar agendamentos futuros por telefone
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
    token TEXT
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
        bt.token
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    LEFT JOIN booking_tokens bt ON bt.booking_id = b.id AND bt.expires_at > NOW()
    WHERE c.phone = p_phone
    AND b.status IN ('pending', 'confirmed')
    AND b.booking_date >= CURRENT_DATE
    ORDER BY b.booking_date ASC, b.booking_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para cancelamento público — exige token OU autenticação admin
CREATE OR REPLACE FUNCTION cancel_booking_public(
    p_booking_id UUID,
    p_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admin autenticado pode cancelar sem token
    IF auth.uid() IS NOT NULL AND is_admin() THEN
        UPDATE bookings
        SET status = 'cancelled'
        WHERE id = p_booking_id
        AND status IN ('pending', 'confirmed')
        AND booking_date >= CURRENT_DATE;
        RETURN FOUND;
    END IF;

    -- Público: exige token válido
    IF p_token IS NULL OR p_token = '' THEN
        RAISE EXCEPTION 'Token de gerenciamento necessário para cancelar.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM booking_tokens
        WHERE booking_id = p_booking_id
        AND token = p_token
        AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'Token inválido ou expirado.';
    END IF;

    UPDATE bookings
    SET status = 'cancelled'
    WHERE id = p_booking_id
    AND status IN ('pending', 'confirmed')
    AND booking_date >= CURRENT_DATE;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualiza política de SELECT de agendamentos pra incluir 'completed'
DROP POLICY IF EXISTS "Leitura publica de agendamentos" ON bookings;
CREATE POLICY "Leitura publica de agendamentos"
ON bookings FOR SELECT
USING (
    (status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE)
    OR status = 'completed'
);
