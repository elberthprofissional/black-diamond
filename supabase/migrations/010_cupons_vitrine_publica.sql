-- ============================================================================
-- 010 — VITRINE PÚBLICA DE CUPONS (fix RLS)
-- ============================================================================
-- A tabela `coupons` tem RLS admin-only (`is_admin()`), então o cliente anon
-- NÃO consegue listar ofertas com SELECT direto — a vitrine do `/cliente`
-- voltava vazia em produção (bug latente: nem a seção antiga "Meus Cupons"
-- funcionava). Esta RPC SECURITY DEFINER expõe apenas os cupons ativos,
-- dentro da validade e com usos restantes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_available_coupons()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_result jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'description', c.description,
        'discount_type', c.discount_type,
        'discount_value', c.discount_value,
        'valid_from', c.valid_from,
        'valid_until', c.valid_until,
        'max_uses', c.max_uses,
        'current_uses', c.current_uses,
        'is_active', c.is_active,
        'applicable_service_ids', c.applicable_service_ids,
        'created_at', c.created_at
    ) ORDER BY c.created_at DESC), jsonb_build_array())
    INTO v_result
    FROM public.coupons c
    WHERE c.is_active = true
      AND CURRENT_DATE >= c.valid_from
      AND (c.valid_until IS NULL OR CURRENT_DATE <= c.valid_until)
      AND (c.max_uses IS NULL OR c.current_uses < c.max_uses);

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_coupons() TO anon, authenticated;
