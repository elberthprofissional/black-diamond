-- =========================================================================
-- BLACK DIAMOND 💈 - MISSING MIGRATIONS
-- =========================================================================
-- Consolidado de todas as migrations que faltam aplicar
-- Gerado automaticamente em Julho 2026
-- =========================================================================

-- =========================================================================
-- 1. DROP BARBER_ID OVERLOADS (20260717_drop_barber_id_overload)
-- Remove function overloads left from multi-barbeiro feature revert
-- =========================================================================
DROP FUNCTION IF EXISTS criar_agendamento(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time without time zone,
    p_preco_total numeric,
    p_duracao_total integer,
    p_cliente_email text,
    p_barber_id uuid
);

DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time without time zone,
    p_preco_total numeric,
    p_duracao_total integer,
    p_cliente_email text,
    p_barber_id uuid
);

-- =========================================================================
-- 2. NO-SHOW (20260717_add_no_show)
-- =========================================================================

-- Coluna no_show na tabela bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT FALSE;

-- Índice para consultas rápidas de no_show por cliente
CREATE INDEX IF NOT EXISTS idx_bookings_no_show_client
ON bookings (client_id, no_show, booking_date DESC)
WHERE no_show = TRUE;

-- Configuração padrão: 3 faltas = bloqueio automático
INSERT INTO settings (key, value) VALUES ('max_no_shows', '3')
ON CONFLICT (key) DO NOTHING;

-- Função: verificar se cliente excedeu limite de faltas
CREATE OR REPLACE FUNCTION is_client_blocked_by_no_show(p_client_id uuid)
RETURNS boolean AS $$
DECLARE
    v_max_no_shows integer;
    v_no_show_count integer;
BEGIN
    SELECT COALESCE(
        (SELECT value::integer FROM settings WHERE key = 'max_no_shows'),
        3
    ) INTO v_max_no_shows;

    SELECT COUNT(*) INTO v_no_show_count
    FROM bookings
    WHERE client_id = p_client_id
    AND no_show = TRUE
    AND booking_date >= (CURRENT_DATE - 90);

    RETURN v_no_show_count >= v_max_no_shows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: bloquear cliente se excedeu limite de faltas
CREATE OR REPLACE FUNCTION check_client_no_show_block(p_client_id uuid)
RETURNS void AS $$
BEGIN
    IF is_client_blocked_by_no_show(p_client_id) THEN
        RAISE EXCEPTION 'Cliente bloqueado por excesso de faltas. Entre em contato para mais informações.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 3. NO-SHOW CHECK NO criar_agendamento_rate_limited (20260717_02_add_no_show_check + fix_no_show_check)
-- =========================================================================
CREATE OR REPLACE FUNCTION criar_agendamento_rate_limited(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time,
    p_preco_total decimal,
    p_duracao_total integer,
    p_cliente_email text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
BEGIN
    IF NOT check_rate_limit('criar_agendamento', 3, 60) THEN
        RAISE EXCEPTION 'Muitas tentativas. Aguarde 1 minuto e tente novamente.';
    END IF;

    -- Busca o cliente ANTES de criar para verificar bloqueio por faltas
    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
        PERFORM check_client_no_show_block(v_client_id);
    END IF;

    RETURN criar_agendamento(
        p_cliente_nome, p_cliente_telefone, p_servicos,
        p_data, p_hora, p_preco_total, p_duracao_total, p_cliente_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 4. LOYALTY CONFIG (20260720_add_loyalty_config)
-- =========================================================================
CREATE TABLE IF NOT EXISTS loyalty_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_threshold integer NOT NULL,
  reward_service_id uuid NOT NULL,
  enabled boolean DEFAULT false,
  created_at timestamp with time zone default now()
);

-- =========================================================================
-- 5. COUPONS (20260721_add_coupons)
-- =========================================================================

-- Tabela de cupons
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

-- Colunas de cupom no bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- RLS: apenas admin pode gerenciar cupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage coupons"
  ON coupons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- RPC: validar cupom
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

-- RPC: aplicar cupom (incrementa current_uses)
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

-- =========================================================================
-- 6. FIX WHATSAPP TEMPLATES RLS
-- =========================================================================
DROP POLICY IF EXISTS "WhatsApp templates admin" ON whatsapp_templates;

CREATE POLICY "WhatsApp templates admin"
ON whatsapp_templates
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- =========================================================================
-- ✅ TODAS AS MIGRATIONS APLICADAS COM SUCESSO!
-- =========================================================================
