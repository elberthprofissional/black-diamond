-- =========================================================================
-- BLACK DIAMOND - 017 - E-MAIL NO DASHBOARD DO CLIENTE
-- =========================================================================
-- get_client_dashboard passa a incluir o e-mail do cliente no campo
-- stats.email (vazio se não cadastrado) — usado pelo /cliente para
-- preencher o card "Minha conta" (adicionar/alterar e-mail).
-- =========================================================================
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
    'mensalista_expires_at', mensalista_expires_at,
    'email', COALESCE(email, '')
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
