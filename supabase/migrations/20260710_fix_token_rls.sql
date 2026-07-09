-- Fix: get_bookings_by_token precisa ser SECURITY DEFINER
-- para que clientes anônimos (não logados) consigam
-- consultar seus agendamentos via token de gerenciamento.

-- Antes: SECURITY INVOKER → anônimo bate em RLS e não consegue ler booking_tokens nem clients
-- Depois: SECURITY DEFINER → roda como dono da função, bypassa RLS

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
