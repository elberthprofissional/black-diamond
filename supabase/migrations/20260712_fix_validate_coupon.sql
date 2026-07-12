-- =========================================================================
-- FIX: validate_coupon - cupom de valor fixo deve retornar o valor do
-- desconto mesmo sem serviços selecionados
-- =========================================================================

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

  -- Valida se o cupom é aplicável aos serviços (só valida se há serviços selecionados)
  IF array_length(v_coupon.applicable_service_ids, 1) > 0 AND array_length(p_service_ids, 1) > 0 THEN
    IF NOT (p_service_ids <@ v_coupon.applicable_service_ids) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Este cupom não é válido para os serviços selecionados.');
    END IF;
  END IF;

  -- Calcula preço dos serviços selecionados
  IF array_length(p_service_ids, 1) > 0 THEN
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
  END IF;

  -- Calcula desconto
  CASE v_coupon.discount_type
    WHEN 'percentage' THEN
      -- Porcentagem: precisa do preço dos serviços
      v_discount := round(v_service_price * v_coupon.discount_value / 100, 2);
    WHEN 'fixed' THEN
      -- Valor fixo: usa o valor direto, sem limitar pelo preço dos serviços
      -- (se há serviços, limita; senão, usa o valor do cupom)
      IF v_service_price > 0 THEN
        v_discount := LEAST(v_coupon.discount_value, v_service_price);
      ELSE
        v_discount := v_coupon.discount_value;
      END IF;
    WHEN 'free' THEN
      -- Grátis: precisa do preço dos serviços
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
