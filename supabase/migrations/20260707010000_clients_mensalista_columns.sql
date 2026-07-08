-- =========================================================================
-- MIGRATION: Garantir colunas de mensalista em clients
-- =========================================================================
-- Bancos criados antes do SQL principal atualizado podem ter recebido apenas
-- mensalista_plan_id. O painel de clientes precisa das tres colunas abaixo.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clients'
          AND column_name = 'is_mensalista'
    ) THEN
        ALTER TABLE public.clients
        ADD COLUMN is_mensalista BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clients'
          AND column_name = 'mensalista_plan_id'
    ) THEN
        ALTER TABLE public.clients
        ADD COLUMN mensalista_plan_id UUID REFERENCES public.mensalista_plans(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clients'
          AND column_name = 'mensalista_expires_at'
    ) THEN
        ALTER TABLE public.clients
        ADD COLUMN mensalista_expires_at DATE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_mensalista
ON public.clients(id)
WHERE is_mensalista;
