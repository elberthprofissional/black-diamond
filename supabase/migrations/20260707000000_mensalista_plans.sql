-- =========================================================================
-- MIGRATION: Sistema de Mensalista Editável
-- =========================================================================
-- Adiciona tabela de planos mensalistas, coluna no client, e defaults.

-- 1. Tabela de planos mensalistas
CREATE TABLE IF NOT EXISTS mensalista_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    included_service_ids UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS para mensalista_plans
ALTER TABLE mensalista_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mensalista plans leitura pública" ON mensalista_plans;
CREATE POLICY "Mensalista plans leitura pública" ON mensalista_plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;
CREATE POLICY "Mensalista plans admin" ON mensalista_plans
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- 3. Índice para queries de planos ativos
CREATE INDEX IF NOT EXISTS idx_mensalista_plans_active ON mensalista_plans(is_active) WHERE is_active;

-- 4. Adicionar coluna mensalista_plan_id na tabela clients
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'mensalista_plan_id'
    ) THEN
        ALTER TABLE clients ADD COLUMN mensalista_plan_id UUID REFERENCES mensalista_plans(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Setting para ativar/desativar o sistema de mensalista
INSERT INTO settings (key, value) VALUES ('mensalista_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- 6. Planos de exemplo (defaults)
-- Só insere se a tabela estiver vazia (primeira vez)
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM mensalista_plans) = 0 THEN
        INSERT INTO mensalista_plans (name, price, included_service_ids, is_active, is_default, sort_order)
        SELECT
            v.name,
            v.price::DECIMAL(10,2),
            COALESCE(
                ARRAY(SELECT id FROM services WHERE services.name = v.service_name),
                '{}'
            ),
            true,
            true,
            v.sort_order
        FROM (VALUES
            ('Plano Black', 150.00, 'Corte de Cabelo', 1),
            ('Plano Gold', 120.00, 'Corte de Cabelo', 2)
        ) AS v(name, price, service_name, sort_order);
    END IF;
END $$;
