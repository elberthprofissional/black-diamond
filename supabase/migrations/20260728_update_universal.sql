-- =========================================================================
-- BLACK DIAMOND 💈 - TABELAS FALTANTES NO UNIVERSAL.SQL
-- =========================================================================
-- As tabelas abaixo existem no banco remoto mas NÃO estavam no
-- supabase/universal.sql original (que parou na migration 20260716).
-- Execute este SQL para sincronizar o schema.
-- =========================================================================

-- 1. Testimonials (20260712_add_testimonials.sql)
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active testimonials" ON testimonials;
CREATE POLICY "Public can read active testimonials"
  ON testimonials FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users full access" ON testimonials;
CREATE POLICY "Authenticated users full access"
  ON testimonials FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 2. Coupons (20260721_add_coupons.sql)
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  description text DEFAULT '',
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free')),
  discount_value numeric NOT NULL DEFAULT 0,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  applicable_service_ids uuid[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage coupons" ON coupons;
CREATE POLICY "Admin can manage coupons"
  ON coupons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 3. Loyalty Config (20260720_add_loyalty_config.sql)
CREATE TABLE IF NOT EXISTS loyalty_config (
  id uuid primary key default uuid_generate_v4(),
  visit_threshold integer not null,
  reward_service_id uuid not null,
  enabled boolean default false,
  created_at timestamp with time zone default now()
);

-- 4. Loyalty Milestones (20260722_loyalty_milestones.sql)
CREATE TABLE IF NOT EXISTS loyalty_milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  visits_required integer NOT NULL CHECK (visits_required > 0),
  reward_service_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES loyalty_milestones(id) ON DELETE CASCADE,
  claimed_at timestamptz DEFAULT now(),
  UNIQUE (client_id, milestone_id)
);

ALTER TABLE loyalty_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage loyalty_milestones" ON loyalty_milestones;
CREATE POLICY "Admin manage loyalty_milestones"
  ON loyalty_milestones FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin read client_milestones" ON client_milestones;
CREATE POLICY "Admin read client_milestones"
  ON client_milestones FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "System insert client_milestones" ON client_milestones;
CREATE POLICY "System insert client_milestones"
  ON client_milestones FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_client_milestones_client ON client_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_milestones_active ON loyalty_milestones(is_active) WHERE is_active;

-- 5. Funções RPC faltantes
CREATE OR REPLACE FUNCTION check_client_milestones(p_client_id uuid)
RETURNS TABLE(
  milestone_id uuid,
  visits_required integer,
  reward_service_id uuid,
  already_claimed boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lm.id AS milestone_id,
    lm.visits_required,
    lm.reward_service_id,
    (cm.id IS NOT NULL) AS already_claimed
  FROM loyalty_milestones lm
  LEFT JOIN client_milestones cm ON cm.milestone_id = lm.id AND cm.client_id = p_client_id
  WHERE lm.is_active = true
  ORDER BY lm.visits_required ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_coupon(
  p_code text,
  p_service_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
  v_discount numeric := 0;
  v_service_price numeric := 0;
BEGIN
  SELECT * INTO v_coupon
  FROM coupons
  WHERE upper(code) = upper(trim(p_code))
    AND is_active = true;

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
  END IF;

  IF array_length(v_coupon.applicable_service_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(s.price), 0) INTO v_service_price
    FROM services s
    WHERE s.id = ANY(v_coupon.applicable_service_ids)
      AND s.id = ANY(p_service_ids);
  ELSE
    SELECT COALESCE(SUM(s.price), 0) INTO v_service_price
    FROM services s
    WHERE s.id = ANY(p_service_ids);
  END IF;

  CASE v_coupon.discount_type
    WHEN 'percentage' THEN
      v_discount := round(v_service_price * v_coupon.discount_value / 100, 2);
    WHEN 'fixed' THEN
      v_discount := LEAST(v_coupon.discount_value, v_service_price);
    WHEN 'free' THEN
      v_discount := v_service_price;
  END CASE;

  v_discount := GREATEST(v_discount, 0);

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', upper(trim(v_coupon.code)),
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'original_price', v_service_price
  );
END;
$$;

CREATE OR REPLACE FUNCTION apply_coupon(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE coupons
  SET current_uses = current_uses + 1
  WHERE id = p_coupon_id;
END;
$$;

-- 6. RPC Pública Milestones (20260725_public_milestones_rpc.sql)
CREATE OR REPLACE FUNCTION get_client_milestones_public(p_client_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_visits INTEGER;
    v_result jsonb;
BEGIN
    SELECT COALESCE(historical_visits, 0) INTO v_visits
    FROM clients
    WHERE id = p_client_id;

    IF NOT FOUND THEN
        RETURN '[]'::jsonb;
    END IF;

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

GRANT EXECUTE ON FUNCTION get_client_milestones_public TO anon, authenticated;
