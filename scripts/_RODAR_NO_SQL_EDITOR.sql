-- =========================================================================
-- BLACK DIAMOND - MIGRATION 012 (CORRIGIDA)
-- =========================================================================
-- 📋 PRA RODAR: Abre o SQL Editor e COLA TUDO
-- 🔗 https://supabase.com/dashboard/project/dbukdhycfaibdshxnatt/sql/new
-- =========================================================================
-- REGRA DE NEGÓCIO (1 PAGAMENTO = 1 MÊS):
--   Se pagou no ÚLTIMO DIA DO MÊS → acesso até último dia do PRÓXIMO mês
--   Se pagou em QUALQUER OUTRO DIA → acesso até último dia do MÊS ATUAL
-- =========================================================================
-- EXEMPLOS:
--   Pagou 30/04 → fica até 31/05 (maio INTEIRO) 🎯
--   Pagou 31/05 → fica até 30/06 (junho INTEIRO) 🎯
--   Pagou 15/04 → fica até 30/04 (restinho de abril)
-- =========================================================================

-- 1. update_subscription_paid (CORRIGIDO)
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
BEGIN
    SELECT id INTO v_sub_id FROM subscriptions
    WHERE barber_id = p_barber_id AND status = 'pending'
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO subscriptions (barber_id, status)
        VALUES (p_barber_id, 'pending')
        RETURNING id INTO v_sub_id;
    END IF;

    v_last_day_current := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

    IF CURRENT_DATE >= v_last_day_current THEN
        v_new_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months - 1 day')::DATE;
    ELSE
        v_new_end := v_last_day_current;
    END IF;

    UPDATE subscriptions SET
        status = 'active',
        current_period_start = CURRENT_DATE,
        current_period_end = v_new_end,
        grace_period_end = v_new_end,
        asaas_payment_id = COALESCE(p_asaas_payment_id, asaas_payment_id),
        updated_at = NOW()
    WHERE id = v_sub_id;

    INSERT INTO payment_logs (subscription_id, barber_id, asaas_payment_id, amount, status, payment_method, paid_at, due_date)
    VALUES (v_sub_id, p_barber_id, p_asaas_payment_id, 50.00, 'confirmed', p_payment_method, NOW(), v_new_end);

    RETURN jsonb_build_object('success', true, 'subscription_id', v_sub_id, 'new_expiry', v_new_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. check_subscription_status (já tá atualizado, mas roda de novo pra garantir)
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

    v_is_active := v_sub.status = 'active' 
                   AND v_sub.current_period_end IS NOT NULL 
                   AND v_sub.current_period_end >= CURRENT_DATE;

    IF v_sub.status = 'active' AND (v_sub.current_period_end IS NULL OR v_sub.current_period_end < CURRENT_DATE) THEN
        v_status := 'expired';
    ELSE
        v_status := v_sub.status;
    END IF;

    v_days_remaining := CASE
        WHEN v_sub.current_period_end IS NULL THEN 0
        ELSE GREATEST(0, v_sub.current_period_end - CURRENT_DATE)
    END;

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

-- 3. auto_create_subscription (trial até fim do mês)
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
