-- =========================================================================
-- Migration: Exigir Token para Cancelamento Público
-- =========================================================================
-- 1. Modifica cancel_booking_public para exigir token (ou auth admin)
-- 2. Modifica get_bookings_by_phone para retornar token (necessário para
--    o fluxo de cancelamento por telefone)
-- =========================================================================

-- 1. Atualiza get_bookings_by_phone para incluir o token de gerenciamento
-- (necessário para o fluxo de cancelamento público via telefone)
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

-- 2. RPC de cancelamento seguro — EXIGE token OU autenticação admin
DROP FUNCTION IF EXISTS cancel_booking_public(p_booking_id UUID);
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
