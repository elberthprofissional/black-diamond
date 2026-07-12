-- ============================================
-- UPDATE 11/07/2026 - Black Diamond
-- Correções identificadas na varredura 360
-- ============================================

-- 1. TABELA: coupons (faltava no universal.sql)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free')),
    discount_value NUMERIC NOT NULL DEFAULT 0,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    applicable_service_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. COLUNAS FALTANTES no bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- 3. TABELA: loyalty_config (faltava no universal.sql)
CREATE TABLE IF NOT EXISTS loyalty_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_threshold INTEGER NOT NULL,
    reward_service_id UUID NOT NULL REFERENCES services(id),
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA: loyalty_milestones (faltava no universal.sql)
CREATE TABLE IF NOT EXISTS loyalty_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visits_required INTEGER NOT NULL CHECK (visits_required > 0),
    reward_service_id UUID NOT NULL REFERENCES services(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA: client_milestones (faltava no universal.sql)
CREATE TABLE IF NOT EXISTS client_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES loyalty_milestones(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (client_id, milestone_id)
);

-- 6. RLS: coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage coupons" ON coupons;
CREATE POLICY "Admin can manage coupons" ON coupons
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 7. RLS: loyalty_config
ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage loyalty_config" ON loyalty_config;
CREATE POLICY "Admin can manage loyalty_config" ON loyalty_config
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 8. RLS: loyalty_milestones
ALTER TABLE loyalty_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage loyalty_milestones" ON loyalty_milestones;
CREATE POLICY "Admin manage loyalty_milestones" ON loyalty_milestones
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 9. RLS: client_milestones
ALTER TABLE client_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read client_milestones" ON client_milestones;
CREATE POLICY "Admin read client_milestones" ON client_milestones
    FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admin insert client_milestones" ON client_milestones;
CREATE POLICY "Admin insert client_milestones" ON client_milestones
    FOR INSERT WITH CHECK (is_admin());

-- 10. CHECK constraint no bookings.status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'bookings_status_check'
        AND conrelid = 'bookings'::regclass
    ) THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
            CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));
    END IF;
END $$;

-- 11. FUNCTION: is_client_blocked_by_no_show
CREATE OR REPLACE FUNCTION is_client_blocked_by_no_show(p_client_id uuid)
RETURNS boolean AS $$
DECLARE
    v_max_no_shows integer;
    v_no_show_count integer;
BEGIN
    SELECT COALESCE(
        (SELECT value::integer FROM settings WHERE key = 'max_no_shows'), 3
    ) INTO v_max_no_shows;
    SELECT COUNT(*) INTO v_no_show_count
    FROM bookings
    WHERE client_id = p_client_id
      AND no_show = TRUE
      AND booking_date >= (CURRENT_DATE - INTERVAL '90 days');
    RETURN v_no_show_count >= v_max_no_shows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. FUNCTION: check_client_no_show_block
CREATE OR REPLACE FUNCTION check_client_no_show_block(p_client_id uuid)
RETURNS void AS $$
BEGIN
    IF is_client_blocked_by_no_show(p_client_id) THEN
        RAISE EXCEPTION 'Cliente bloqueado por excesso de faltas.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. FUNCTION: validate_coupon
CREATE OR REPLACE FUNCTION validate_coupon(p_code text, p_service_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_coupon coupons%ROWTYPE;
    v_discount numeric := 0;
    v_service_price numeric := 0;
BEGIN
    SELECT * INTO v_coupon FROM coupons
    WHERE upper(code) = upper(trim(p_code)) AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Cupom não encontrado ou inativo.');
    END IF;

    IF CURRENT_DATE < v_coupon.valid_from THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Este cupom ainda não está ativo.');
    END IF;

    IF v_coupon.valid_until IS NOT NULL AND CURRENT_DATE > v_coupon.valid_until THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Este cupom expirou.');
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Este cupom atingiu o limite de uso.');
    END IF;

    IF array_length(v_coupon.applicable_service_ids, 1) > 0 THEN
        IF NOT (p_service_ids <@ v_coupon.applicable_service_ids) THEN
            RETURN jsonb_build_object('valid', false, 'error', 'Este cupom não é válido para os serviços selecionados.');
        END IF;
        SELECT COALESCE(SUM(s.price), 0) INTO v_service_price
        FROM services s WHERE s.id = ANY(v_coupon.applicable_service_ids) AND s.id = ANY(p_service_ids);
    ELSE
        SELECT COALESCE(SUM(s.price), 0) INTO v_service_price
        FROM services s WHERE s.id = ANY(p_service_ids);
    END IF;

    CASE v_coupon.discount_type
        WHEN 'percentage' THEN v_discount := round(v_service_price * v_coupon.discount_value / 100, 2);
        WHEN 'fixed' THEN v_discount := LEAST(v_coupon.discount_value, v_service_price);
        WHEN 'free' THEN v_discount := v_service_price;
    END CASE;

    RETURN jsonb_build_object(
        'valid', true,
        'coupon_id', v_coupon.id,
        'code', upper(trim(v_coupon.code)),
        'discount_type', v_coupon.discount_type,
        'discount_value', v_coupon.discount_value,
        'discount_amount', GREATEST(v_discount, 0),
        'original_price', v_service_price
    );
END;
$$;

-- 14. FUNCTION: apply_coupon
CREATE OR REPLACE FUNCTION apply_coupon(p_coupon_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE coupons SET current_uses = current_uses + 1 WHERE id = p_coupon_id;
END;
$$;

-- 15. FUNCTION: check_client_milestones
CREATE OR REPLACE FUNCTION check_client_milestones(p_client_id uuid)
RETURNS TABLE(milestone_id uuid, visits_required integer, reward_service_id uuid, already_claimed boolean)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT lm.id, lm.visits_required, lm.reward_service_id, (cm.id IS NOT NULL)
    FROM loyalty_milestones lm
    LEFT JOIN client_milestones cm ON cm.milestone_id = lm.id AND cm.client_id = p_client_id
    WHERE lm.is_active = true
    ORDER BY lm.visits_required ASC;
END;
$$;

-- 16. INDEXES faltantes
CREATE INDEX IF NOT EXISTS idx_bookings_no_show_client
    ON bookings (client_id, no_show, booking_date DESC) WHERE no_show = TRUE;
CREATE INDEX IF NOT EXISTS idx_client_milestones_client
    ON client_milestones (client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_milestones_active
    ON loyalty_milestones (is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_coupons_code
    ON coupons (upper(code));

-- 17. Settings padrão
INSERT INTO settings (key, value) VALUES ('max_no_shows', '3')
    ON CONFLICT (key) DO NOTHING;

-- 18. Correção: blocked slots devem ter status 'cancelled' em vez de 'confirmed'
UPDATE bookings SET status = 'cancelled'
WHERE is_blocked = true AND client_id IS NULL AND status = 'confirmed';

-- FIM DO UPDATE 11/07/2026
