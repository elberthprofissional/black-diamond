-- Migration: add coupons table and booking discount support

-- 1. Tabela de cupons
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

-- 2. Colunas de cupom no bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- 3. RLS: apenas admin pode gerenciar cupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage coupons" ON coupons;
CREATE POLICY "Admin can manage coupons"
  ON coupons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. RPC: validar cupom
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
  -- Busca cupom por código (case-insensitive)
  SELECT * INTO v_coupon
  FROM coupons
  WHERE upper(code) = upper(trim(p_code))
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom não encontrado ou inativo.');
  END IF;

  -- Verifica validade
  IF CURRENT_DATE < v_coupon.valid_from THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este cupom ainda não está ativo.');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND CURRENT_DATE > v_coupon.valid_until THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este cupom expirou.');
  END IF;

  -- Verifica limite de usos
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este cupom atingiu o limite de uso.');
  END IF;

  -- Verifica serviços aplicáveis
  IF array_length(v_coupon.applicable_service_ids, 1) > 0 THEN
    IF NOT (p_service_ids <@ v_coupon.applicable_service_ids) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Este cupom não é válido para os serviços selecionados.');
    END IF;
  END IF;

  -- Calcula preço dos serviços elegíveis
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

  -- Calcula desconto conforme o tipo
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

-- 5. RPC: aplicar cupom (incrementa current_uses)
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
