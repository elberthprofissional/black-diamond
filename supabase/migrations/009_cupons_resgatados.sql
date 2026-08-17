-- ============================================================================
-- 009 — CUPONS RESGATADOS (v3.37)
-- ============================================================================
-- Estilo "Shopee": o cliente resgata um cupom com 1 clique na vitrine do
-- /cliente e a posse fica registrada no banco (client_coupons). No agendamento
-- ele usa o cupom resgatado sem digitar código.
--
-- Regras:
--  * A tabela client_coupons NÃO tem policies — todo acesso passa pelas RPCs
--    SECURITY DEFINER abaixo (nada de leitura/escrita direta pelo client).
--  * Resgatar NÃO segura vaga de cupom com max_uses (primeiro que usa, ganha —
--    a validação real continua no momento do agendamento via validate_coupon).
--  * Rate limit por telefone em resgatar_cupom (10/min) via check_rate_limit.
-- ============================================================================

-- ── 1. Tabela de posse ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    redeemed_at timestamptz NOT NULL DEFAULT now(),
    used_at timestamptz,
    UNIQUE (client_id, coupon_id)
);

CREATE INDEX IF NOT EXISTS idx_client_coupons_client ON public.client_coupons(client_id);

ALTER TABLE public.client_coupons ENABLE ROW LEVEL SECURITY;

-- Sem policies: acesso exclusivo via RPCs SECURITY DEFINER (abaixo).

-- ── 2. Listar cupons resgatados do cliente ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_client_coupons(p_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_client_id uuid;
    v_result jsonb;
    v_phone text;
BEGIN
    v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    IF v_phone = '' THEN
        RETURN jsonb_build_array();
    END IF;

    SELECT id INTO v_client_id FROM public.clients
    WHERE regexp_replace(phone, '\D', '', 'g') = v_phone AND deleted_at IS NULL
    LIMIT 1;

    IF v_client_id IS NULL THEN
        RETURN jsonb_build_array();
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cc.id,
        'coupon_id', cc.coupon_id,
        'code', c.code,
        'description', c.description,
        'discount_type', c.discount_type,
        'discount_value', c.discount_value,
        'valid_from', c.valid_from,
        'valid_until', c.valid_until,
        'max_uses', c.max_uses,
        'current_uses', c.current_uses,
        'is_active', c.is_active,
        'redeemed_at', cc.redeemed_at,
        'used_at', cc.used_at
    ) ORDER BY cc.redeemed_at DESC), jsonb_build_array())
    INTO v_result
    FROM public.client_coupons cc
    JOIN public.coupons c ON c.id = cc.coupon_id
    WHERE cc.client_id = v_client_id;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_coupons(text) TO anon, authenticated;

-- ── 3. Resgatar cupom (valida + grava posse) ────────────────────────────────

CREATE OR REPLACE FUNCTION public.resgatar_cupom(p_phone text, p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_client_id uuid;
    v_coupon public.coupons%ROWTYPE;
    v_phone text;
BEGIN
    v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    IF v_phone = '' OR coalesce(p_code, '') = '' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Informe telefone e código do cupom.');
    END IF;

    IF NOT check_rate_limit('resgatar_cupom:' || v_phone, 10, 60) THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto e tente novamente.');
    END IF;

    SELECT id INTO v_client_id FROM public.clients
    WHERE regexp_replace(phone, '\D', '', 'g') = v_phone AND deleted_at IS NULL
    LIMIT 1;
    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    SELECT * INTO v_coupon FROM public.coupons
    WHERE upper(code) = upper(trim(p_code)) AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cupom não encontrado.');
    END IF;

    IF CURRENT_DATE < v_coupon.valid_from THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Este cupom ainda não está ativo.');
    END IF;
    IF v_coupon.valid_until IS NOT NULL AND CURRENT_DATE > v_coupon.valid_until THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Este cupom expirou.');
    END IF;
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Limite de usos atingido.');
    END IF;

    IF EXISTS (SELECT 1 FROM public.client_coupons
               WHERE client_id = v_client_id AND coupon_id = v_coupon.id) THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Você já resgatou este cupom.');
    END IF;

    INSERT INTO public.client_coupons (client_id, coupon_id)
    VALUES (v_client_id, v_coupon.id);

    RETURN jsonb_build_object(
        'ok', true,
        'message', 'Cupom resgatado! Use no agendamento.',
        'coupon_id', v_coupon.id,
        'code', upper(trim(v_coupon.code))
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resgatar_cupom(text, text) TO anon, authenticated;

-- ── 4. Marcar cupom resgatado como usado (após agendamento concluído) ───────

CREATE OR REPLACE FUNCTION public.usar_cupom_resgatado(p_phone text, p_coupon_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_client_id uuid;
    v_phone text;
BEGIN
    v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    IF v_phone = '' OR p_coupon_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Parâmetros inválidos.');
    END IF;

    SELECT id INTO v_client_id FROM public.clients
    WHERE regexp_replace(phone, '\D', '', 'g') = v_phone AND deleted_at IS NULL
    LIMIT 1;
    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    UPDATE public.client_coupons
    SET used_at = now()
    WHERE client_id = v_client_id AND coupon_id = p_coupon_id AND used_at IS NULL;

    RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.usar_cupom_resgatado(text, uuid) TO anon, authenticated;
