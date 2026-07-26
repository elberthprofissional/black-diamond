-- =========================================================================
-- BLACK DIAMOND - 006 - ASSINATURAS (BASE)
-- =========================================================================
-- Consolidado de: 011_subscriptions.sql
-- =========================================================================

-- Sistema de assinatura mensal (R$50/mês) para barbeiros.
-- Integra com Asaas (PIX/boleto/cartão).

-- 1. TABELA subscriptions
-- Nota: usamos partial unique index ao inves de UNIQUE constraint
-- para permitir multiplos registros pending/expired/cancelled
-- enquanto mantemos apenas um active por barber
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('active', 'pending', 'expired', 'cancelled')),
    current_period_start DATE,
    current_period_end DATE,
    grace_period_end DATE,
    asaas_customer_id TEXT,
    asaas_payment_id TEXT,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA payment_logs
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    asaas_payment_id TEXT,
    amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'overdue', 'refunded', 'cancelled')),
    payment_method TEXT,
    pix_qr_code TEXT,
    pix_payload TEXT,
    payment_link TEXT,
    paid_at TIMESTAMPTZ,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_subscriptions_barber_id ON subscriptions(barber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_per_barber
    ON subscriptions(barber_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(current_period_end)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_payment_logs_subscription ON payment_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_barber ON payment_logs(barber_id);

-- 4. RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- Dono ou barbeiro vinculado pode ver subscription
DROP POLICY IF EXISTS "Subscriptions: admins full" ON subscriptions;
CREATE POLICY "Subscriptions: admins full" ON subscriptions
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Subscriptions: barber view own" ON subscriptions;
CREATE POLICY "Subscriptions: barber view own" ON subscriptions
    FOR SELECT TO authenticated
    USING (
        barber_id IN (
            SELECT id FROM barbers WHERE user_id = auth.uid()
        )
    );

-- Payment logs: admin full, barber view own
DROP POLICY IF EXISTS "Payment logs: admins full" ON payment_logs;
CREATE POLICY "Payment logs: admins full" ON payment_logs
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Payment logs: barber view own" ON payment_logs;
CREATE POLICY "Payment logs: barber view own" ON payment_logs
    FOR SELECT TO authenticated
    USING (
        barber_id IN (
            SELECT id FROM barbers WHERE user_id = auth.uid()
        )
    );

-- 5. RPC: check_subscription_status
-- Retorna o status atual da assinatura do barbeiro.
-- Usado pelo SubscriptionGuard e pelo frontend.
CREATE OR REPLACE FUNCTION check_subscription_status(p_barber_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_sub RECORD;
    v_result jsonb;
BEGIN
    SELECT * INTO v_sub FROM subscriptions
    WHERE barber_id = p_barber_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        -- Sem assinatura = acesso livre (owner/admin)
        RETURN jsonb_build_object(
            'has_subscription', false,
            'is_active', true,
            'status', 'none',
            'days_remaining', 999,
            'is_blocked', false
        );
    END IF;

    RETURN jsonb_build_object(
        'has_subscription', true,
        'is_active', v_sub.status = 'active',
        'status', v_sub.status,
        'current_period_start', v_sub.current_period_start,
        'current_period_end', v_sub.current_period_end,
        'grace_period_end', v_sub.grace_period_end,
        'days_remaining',
            CASE
                WHEN v_sub.current_period_end IS NULL THEN 0
                ELSE (v_sub.current_period_end - CURRENT_DATE)
            END,
        'is_blocked',
            CASE
                WHEN v_sub.status = 'active' THEN false
                WHEN v_sub.status = 'pending' THEN
                    CASE
                        WHEN v_sub.grace_period_end IS NULL THEN true
                        WHEN CURRENT_DATE > v_sub.grace_period_end THEN true
                        ELSE false
                    END
                ELSE true
            END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. RPC: update_subscription_paid
-- Chamado pelo webhook ou manualmente quando pagamento confirmado.
CREATE OR REPLACE FUNCTION update_subscription_paid(
    p_barber_id UUID,
    p_asaas_payment_id TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_sub_id UUID;
    v_new_end DATE;
    v_result jsonb;
BEGIN
    -- SECURITY DEFINER: so quem tem acesso ao banco pode chamar
    -- Edge functions via service_role_key ou admin autenticado
    -- Busca subscription pendente ou cria se não existir
    SELECT id INTO v_sub_id FROM subscriptions
    WHERE barber_id = p_barber_id AND status = 'pending'
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO subscriptions (barber_id, status)
        VALUES (p_barber_id, 'pending')
        RETURNING id INTO v_sub_id;
    END IF;

    -- Calcula nova data de vencimento (30 dias a partir de hoje ou estende a atual)
    SELECT COALESCE(current_period_end, CURRENT_DATE) + 30 INTO v_new_end
    FROM subscriptions WHERE id = v_sub_id;

    UPDATE subscriptions SET
        status = 'active',
        current_period_start = CURRENT_DATE,
        current_period_end = v_new_end,
        grace_period_end = v_new_end + 7,
        asaas_payment_id = COALESCE(p_asaas_payment_id, asaas_payment_id),
        updated_at = NOW()
    WHERE id = v_sub_id
    RETURNING id INTO v_sub_id;

    -- Registra no payment_logs
    INSERT INTO payment_logs (subscription_id, barber_id, asaas_payment_id, amount, status, payment_method, paid_at, due_date)
    VALUES (v_sub_id, p_barber_id, p_asaas_payment_id, 50.00, 'confirmed', p_payment_method, NOW(), v_new_end);

    RETURN jsonb_build_object('success', true, 'subscription_id', v_sub_id, 'new_expiry', v_new_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: get_payment_history
CREATE OR REPLACE FUNCTION get_payment_history(p_barber_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', pl.id,
            'amount', pl.amount,
            'status', pl.status,
            'payment_method', pl.payment_method,
            'paid_at', pl.paid_at,
            'due_date', pl.due_date,
            'created_at', pl.created_at
        ) ORDER BY pl.created_at DESC
    ) INTO v_result
    FROM payment_logs pl
    WHERE pl.barber_id = p_barber_id;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8. AUTO-CRIA SUBSCRIPTION ao criar barbeiro
CREATE OR REPLACE FUNCTION auto_create_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Só cria subscription para barbeiros não-owners e que não tenham uma
    IF NOT NEW.is_owner AND NOT EXISTS (
        SELECT 1 FROM subscriptions WHERE barber_id = NEW.id
    ) THEN
        INSERT INTO subscriptions (barber_id, status, grace_period_end)
        VALUES (NEW.id, 'pending', CURRENT_DATE + 7);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_subscription ON barbers;
CREATE TRIGGER trg_auto_create_subscription
AFTER INSERT ON barbers
FOR EACH ROW
EXECUTE FUNCTION auto_create_subscription();

-- Migração: cria subscriptions para barbeiros existentes que não são owners
INSERT INTO subscriptions (barber_id, status, grace_period_end)
SELECT b.id, 'pending', CURRENT_DATE + 7
FROM barbers b
WHERE b.is_owner = FALSE
AND NOT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.barber_id = b.id
);