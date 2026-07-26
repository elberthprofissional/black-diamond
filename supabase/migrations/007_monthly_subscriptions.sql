-- =========================================================================
-- BLACK DIAMOND - 007 - ASSINATURA MENSAL (CORRIGIDO)
-- =========================================================================
-- Consolidado de: 012_monthly_subscriptions.sql
-- =========================================================================

-- Altera o modelo de assinatura de "30 dias a partir do pagamento"
-- para "mensal calendário" (1 pagamento = 1 mês).
--
-- REGRA:
--   Se pagou no ÚLTIMO DIA DO MÊS → acesso até último dia do PRÓXIMO mês
--   Se pagou em QUALQUER OUTRO DIA → acesso até último dia do MÊS ATUAL
--
-- Isso incentiva o barbeiro a pagar SEMPRE no último dia do mês,
-- garantindo 1 mês inteiro de acesso por R$ 50,00.
--
-- EXEMPLOS:
--   Pagou 30/04 (último dia) → fica até 31/05 (maio inteiro) 🎯
--   Pagou 31/05 (último dia) → fica até 30/06 (junho inteiro) 🎯
--   Pagou 15/04 (meio do mês) → fica até 30/04 (resto de abril)

-- 1. RPC: update_subscription_paid (ATUALIZADO)
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
    -- Busca subscription pendente ou cria se não existir
    SELECT id INTO v_sub_id FROM subscriptions
    WHERE barber_id = p_barber_id AND status = 'pending'
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO subscriptions (barber_id, status)
        VALUES (p_barber_id, 'pending')
        RETURNING id INTO v_sub_id;
    END IF;

    -- Calcula o último dia do mês atual
    v_last_day_current := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

    -- REGRA DE NEGÓCIO:
    -- Se HOJE é o último dia do mês → acesso ATÉ o último dia do PRÓXIMO mês
    -- Se HOJE NÃO é o último dia → acesso ATÉ o último dia do MÊS ATUAL
    IF CURRENT_DATE >= v_last_day_current THEN
        -- Pagou no último dia do mês → leva o mês INTEIRO que vem
        v_new_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months - 1 day')::DATE;
    ELSE
        -- Pagou antes do último dia → só até o fim deste mês
        v_new_end := v_last_day_current;
    END IF;

    UPDATE subscriptions SET
        status = 'active',
        current_period_start = CURRENT_DATE,
        current_period_end = v_new_end,
        grace_period_end = v_new_end, -- sem graça extra, bloqueia no último dia
        asaas_payment_id = COALESCE(p_asaas_payment_id, asaas_payment_id),
        updated_at = NOW()
    WHERE id = v_sub_id;

    -- Registra no payment_logs
    INSERT INTO payment_logs (subscription_id, barber_id, asaas_payment_id, amount, status, payment_method, paid_at, due_date)
    VALUES (v_sub_id, p_barber_id, p_asaas_payment_id, 50.00, 'confirmed', p_payment_method, NOW(), v_new_end);

    RETURN jsonb_build_object('success', true, 'subscription_id', v_sub_id, 'new_expiry', v_new_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: check_subscription_status (ATUALIZADO)
-- Agora verifica a DATA também: se current_period_end já passou,
-- mesmo com status='active' a assinatura é considerada expirada.
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

    -- Calcula is_active: status tem que ser 'active' E a data tem que ser válida
    v_is_active := v_sub.status = 'active' 
                   AND v_sub.current_period_end IS NOT NULL 
                   AND v_sub.current_period_end >= CURRENT_DATE;

    -- Status lógico: se status='active' mas já passou da data, é 'expired'
    IF v_sub.status = 'active' AND (v_sub.current_period_end IS NULL OR v_sub.current_period_end < CURRENT_DATE) THEN
        v_status := 'expired';
    ELSE
        v_status := v_sub.status;
    END IF;

    -- Dias restantes (nunca negativo)
    v_days_remaining := CASE
        WHEN v_sub.current_period_end IS NULL THEN 0
        ELSE GREATEST(0, v_sub.current_period_end - CURRENT_DATE)
    END;

    -- Bloqueado: só não está bloqueado se estiver ativo E dentro do período
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

-- 3. TRIGGER: auto_create_subscription (ATUALIZADO)
-- Novo barbeiro não-owner ganha trial até o ÚLTIMO DIA DO MÊS ATUAL
-- (ao invés de 7 dias corridos)
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