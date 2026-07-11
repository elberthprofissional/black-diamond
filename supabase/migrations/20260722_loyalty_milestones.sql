-- =========================================================================
-- BLACK DIAMOND 💈 - Loyalty Milestones (Multi-Tier)
-- =========================================================================
-- Substitui o modelo antigo (1 config, reset de visitas) por múltiplas metas:
--   loyalty_milestones: configuração de cada meta (ex: 5 visitas → sobrancelha)
--   client_milestones: registro de quais metas cada cliente já resgatou
--   historical_visits: NUNCA mais reseta, só acumula
-- =========================================================================

-- 1. Tabela de milestones (metas configuráveis)
CREATE TABLE IF NOT EXISTS loyalty_milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  visits_required integer NOT NULL CHECK (visits_required > 0),
  reward_service_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Tabela de milestones resgatados por cliente
CREATE TABLE IF NOT EXISTS client_milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES loyalty_milestones(id) ON DELETE CASCADE,
  claimed_at timestamptz DEFAULT now(),
  UNIQUE (client_id, milestone_id)
);

-- 3. RLS
ALTER TABLE loyalty_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_milestones ENABLE ROW LEVEL SECURITY;

-- Admin gerencia milestones
DROP POLICY IF EXISTS "Admin manage loyalty_milestones" ON loyalty_milestones;
CREATE POLICY "Admin manage loyalty_milestones"
  ON loyalty_milestones FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin vê resgates, sistema insere
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

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_client_milestones_client ON client_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_milestones_active ON loyalty_milestones(is_active) WHERE is_active;

-- 5. Função: verificar milestones disponíveis para um cliente
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

-- =========================================================================
-- ✅ FIM DA MIGRATION
-- =========================================================================
