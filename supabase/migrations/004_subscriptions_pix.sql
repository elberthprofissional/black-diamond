-- =========================================================================
-- BLACK DIAMOND - 004 - ASSINATURAS PIX + BLOQUEIO
-- =========================================================================
-- Consolidado de: 006_subscriptions_pix.sql, 007_fix_agendamento.sql
-- Subscriptions, payment_logs, payment_blocked_users, check_login_allowed, PIX e fix do agendamento.
-- =========================================================================


-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 006_subscriptions_pix.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 006 - ASSINATURAS + PIX + BLOQUEIO
-- =========================================================================
-- Consolidado de: 006_subscriptions.sql, 007_monthly_subscriptions.sql,
--                 008_pix_setup.sql, 011_payment_blocked_users.sql
-- =========================================================================

----------------------------------------------------------------------
-- PARTE 1: TABELAS DE ASSINATURA
----------------------------------------------------------------------

-- 1.1 TABELA subscriptions
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

-- 1.2 TABELA payment_logs
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

-- 1.3 INDEXES
CREATE INDEX IF NOT EXISTS idx_subscriptions_barber_id ON subscriptions(barber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_per_barber
    ON subscriptions(barber_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(current_period_end)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_payment_logs_subscription ON payment_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_barber ON payment_logs(barber_id);

-- 1.4 RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

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

----------------------------------------------------------------------
-- PARTE 2: FUNÇÕES DE ASSINATURA (VERSÃO FINAL - MENSAL CALENDÁRIO)
----------------------------------------------------------------------

-- 2.1 update_subscription_paid (versão mensal calendário)
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
    SELECT id INTO v_sub_id FROM subscriptions
    WHERE barber_id = p_barber_id AND status = 'pending'
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO subscriptions (barber_id, status)
        VALUES (p_barber_id, 'pending')
        RETURNING id INTO v_sub_id;
    END IF;

    v_last_day_current := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

    -- REGRA: se pagou no último dia do mês → leva o mês INTEIRO seguinte
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

-- 2.2 check_subscription_status (versão final)
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

-- 2.3 get_payment_history
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

-- 2.4 auto_create_subscription (versão final - trial até fim do mês)
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

DROP TRIGGER IF EXISTS trg_auto_create_subscription ON barbers;
CREATE TRIGGER trg_auto_create_subscription
AFTER INSERT ON barbers
FOR EACH ROW
EXECUTE FUNCTION auto_create_subscription();

----------------------------------------------------------------------
-- PARTE 3: PIX SETUP + MIGRAÇÃO
----------------------------------------------------------------------

-- 3.1 Chave PIX e email do proprietário
INSERT INTO settings (key, value)
VALUES ('owner_pix_key', '70263397610')
ON CONFLICT (key) DO UPDATE SET value = '70263397610';

INSERT INTO settings (key, value)
VALUES ('owner_email', 'elberthmayan2007@gmail.com')
ON CONFLICT (key) DO NOTHING;

-- 3.2 Cria subscriptions ativas para barbeiros existentes não-owners
INSERT INTO subscriptions (barber_id, status, current_period_start, current_period_end)
SELECT
  b.id,
  'active',
  CURRENT_DATE,
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
FROM barbers b
WHERE b.is_owner = FALSE
AND NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.barber_id = b.id
);

----------------------------------------------------------------------
-- PARTE 4: BLOQUEIO POR PAGAMENTO (SERVER-SIDE)
----------------------------------------------------------------------

-- 4.1 Tabela de usuários bloqueados
CREATE TABLE IF NOT EXISTS payment_blocked_users (
    email TEXT PRIMARY KEY,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT DEFAULT 'payment_missing',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_blocked_users_email ON payment_blocked_users(email);
ALTER TABLE payment_blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage payment_blocked_users" ON payment_blocked_users;
CREATE POLICY "Admin manage payment_blocked_users"
    ON payment_blocked_users FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- 4.2 Função de verificação de login
-- Lê o email do proprietário da tabela settings (não hardcoded)
CREATE OR REPLACE FUNCTION check_login_allowed(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_blocked RECORD;
    v_owner_email TEXT;
BEGIN
    -- Busca email do proprietário da settings (configurável sem editar SQL)
    SELECT COALESCE(value, 'elberthmayan2007@gmail.com') INTO v_owner_email
    FROM settings WHERE key = 'owner_email';

    -- Owner sempre pode logar
    IF LOWER(TRIM(p_email)) = LOWER(TRIM(v_owner_email)) THEN
        RETURN jsonb_build_object('allowed', true, 'reason', null);
    END IF;

    -- Verifica se o email está na lista de bloqueados
    SELECT * INTO v_blocked
    FROM payment_blocked_users
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', '❌ Conta bloqueada por falta de pagamento. ' ||
                      'Entre em contato com o administrador para regularizar a mensalidade de R$ 50,00. ' ||
                      'Após a confirmação, você poderá acessar normalmente.'
        );
    END IF;

    RETURN jsonb_build_object('allowed', true, 'reason', null);
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- >>> SEÇÃO: 007_fix_agendamento.sql <<<
-- ──────────────────────────────────────────────────────────────
-- =========================================================================
-- BLACK DIAMOND - 007 - FIX: AGENDAMENTO + WRAPPER
-- =========================================================================
-- Consolidado de: 009_fix_criar_agendamento.sql, 010_wrapper_criar_agendamento.sql
-- =========================================================================

-- Dropar versões antigas (se existirem)
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text);
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric);

-- Função principal com rate limiting e no-show check
-- Frontend chama com named params (Supabase RPC), entao p_discount_amount
-- e recebido mas NAO usado para calcular desconto (calculo 100% server-side
-- dentro de criar_agendamento). Mantido apenas para compatibilidade.
CREATE OR REPLACE FUNCTION criar_agendamento_rate_limited(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time,
    p_preco_total decimal,
    p_duracao_total integer,
    p_cliente_email text DEFAULT NULL,
    p_coupon_id uuid DEFAULT NULL,
    p_discount_amount decimal DEFAULT 0,
    p_barber_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
BEGIN
    IF NOT check_rate_limit('criar_agendamento', 3, 60) THEN
        RAISE EXCEPTION 'Muitas tentativas. Aguarde 1 minuto e tente novamente.';
    END IF;

    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;
    IF v_client_id IS NOT NULL THEN
        PERFORM check_client_no_show_block(v_client_id);
    END IF;

    RETURN criar_agendamento(
        p_cliente_nome, p_cliente_telefone, p_servicos,
        p_data, p_hora, p_preco_total, p_duracao_total, p_cliente_email,
        p_coupon_id, p_barber_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissão para a versão com parâmetros nomeados (frontend)
GRANT EXECUTE ON FUNCTION criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric, uuid) TO anon, authenticated;

-- Wrapper removido: a versão acima com named params já cobre todos os casos.
-- A wrapper duplicada com ordem invertida de parâmetros (barber_id primeiro)
-- causava ambiguidade na resolução de named parameters pelo Supabase RPC.
DROP FUNCTION IF EXISTS public.criar_agendamento_rate_limited(uuid, text, text, text, uuid, date, numeric, integer, time, numeric, uuid[]);

