-- =========================================================================
-- BLACK DIAMOND - AUTO-CANCEL COM 2H DE BUFFER (v2)
-- =========================================================================
-- Ao inves de marcar como 'completed', marca como 'cancelled' para bookings
-- do dia atual. Isso evita inflar faturamento com servicos que nao foram
-- realizados. O barbeiro tem 2h pra finalizar manualmente; se esquecer,
-- o booking eh cancelado (nao completado) pra nao mentir nos dados.
-- =========================================================================

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
