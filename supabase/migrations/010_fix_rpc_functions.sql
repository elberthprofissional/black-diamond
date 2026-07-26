-- =========================================================================
-- BLACK DIAMOND - FIX MISSING RPC FUNCTIONS (v3.27.2)
-- =========================================================================
-- Corrige 3 bugs críticos:
-- 1. save_loyalty_milestones - não existia, quebrava o salvamento de metas
-- 2. increment_client_visits (plural) - frontend chamava plural mas só existia singular
-- 3. log_reminder_sent - não existia, quebrava o log de lembretes
-- =========================================================================

-- =========================================================================
-- 1. RPC: save_loyalty_milestones
-- =========================================================================
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

-- =========================================================================
-- 2. RPC: log_reminder_sent
-- =========================================================================
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

-- =========================================================================
-- 3. RPC: increment_client_visits (alias - plural)
-- =========================================================================
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
