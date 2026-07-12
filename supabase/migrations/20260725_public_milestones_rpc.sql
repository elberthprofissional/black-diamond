-- =========================================================================
-- BLACK DIAMOND 💈 - Public Milestones RPC
-- =========================================================================
-- Permite que usuários anônimos (página de agendamento) consultem
-- seu progresso de fidelidade sem quebrar o RLS.
--
-- COMO USAR:
--   Vá no painel do Supabase → SQL Editor → cole e execute.
-- =========================================================================

-- RPC pública: retorna milestones + progresso do cliente
-- Usa SECURITY DEFINER para ignorar RLS (mas só expõe dados mínimos)
CREATE OR REPLACE FUNCTION get_client_milestones_public(p_client_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_visits INTEGER;
    v_result jsonb;
    v_milestones jsonb;
    v_claimed_ids TEXT[];
BEGIN
    -- Busca visitas acumuladas do cliente
    SELECT COALESCE(historical_visits, 0) INTO v_visits
    FROM clients
    WHERE id = p_client_id;

    IF NOT FOUND THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Busca milestones ativas
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'milestone', jsonb_build_object(
                'id', lm.id,
                'visits_required', lm.visits_required,
                'reward_service_id', lm.reward_service_id
            ),
            'progress', v_visits,
            'already_claimed', (cm.id IS NOT NULL)
        )
        ORDER BY lm.visits_required ASC
    ), '[]'::jsonb) INTO v_result
    FROM loyalty_milestones lm
    LEFT JOIN client_milestones cm ON cm.milestone_id = lm.id AND cm.client_id = p_client_id
    WHERE lm.is_active = true;

    RETURN v_result;
END;
$$;

-- Permite que qualquer um (anon) chame essa função
GRANT EXECUTE ON FUNCTION get_client_milestones_public TO anon, authenticated;

-- =========================================================================
-- ✅ PRONTO! A página de agendamento já consegue ver o progresso.
-- =========================================================================
