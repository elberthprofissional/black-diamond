-- =========================================================================
-- BLACK DIAMOND - PACK DE CORRECAO SQL
-- =========================================================================
-- Execute este arquivo no SQL Editor do Supabase apos o schema principal.
-- Corrige: RLS na tabela secrets, ordem de is_admin(), limpar_agendamentos,
--          CHECK constraint no status, e reviews rate limit.
-- =========================================================================

-- =========================================================================
-- 1. HABILITAR RLS NA TABELA SECRETS (CRITICO - SEGURANCA)
-- =========================================================================
-- A tabela secrets estava sem RLS, permitindo que qualquer pessoa lesse as API keys.

ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

-- Politicas: apenas admin pode acessar
DROP POLICY IF EXISTS "Secrets admin gerencia" ON secrets;
CREATE POLICY "Secrets admin gerencia" ON secrets FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());


-- =========================================================================
-- 2. REORDENAR: Criar is_admin() ANTES das policies (se rodando do zero)
-- =========================================================================
-- Se voce ja rodou o schema principal e as policies ja existem com is_admin(),
-- esta secao nao e necessaria. Mas se for recriar tudo, a ordem importa.
-- Ja esta corrigido no schema principal (is_admin() definido antes das policies).


-- =========================================================================
-- 3. CORRIGIR limpar_agendamentos_semana() - Codigo morto removido
-- =========================================================================
-- O DELETE nunca executava porque o UPDATE ja mudava is_blocked para FALSE antes.

CREATE OR REPLACE FUNCTION limpar_agendamentos_semana()
RETURNS void AS $$
BEGIN
    -- Marca agendamentos antigos como completed
    UPDATE bookings
    SET status = 'completed'
    WHERE booking_date < CURRENT_DATE
    AND status IN ('confirmed', 'pending')
    AND is_blocked = FALSE;

    -- Remove bloqueios antigos (cancela direto, sem UPDATE + DELETE redundante)
    UPDATE bookings
    SET is_blocked = FALSE, status = 'cancelled'
    WHERE booking_date < CURRENT_DATE
    AND is_blocked = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 4. ADICIONAR CHECK CONSTRAINT NO STATUS (EVITAR TYPOS)
-- =========================================================================
-- Impede valores como 'Canceled', 'CANCELED', 'canceleld' de bypassar o unique index.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'bookings_status_check'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_status_check
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));
    END IF;
END $$;


-- =========================================================================
-- 5. RATE LIMIT NO INSERT DE REVIEWS (EVITAR SPAM)
-- =========================================================================
-- Remove a policy antiga de insercao publica e substitui por uma com validacao.

DROP POLICY IF EXISTS "Reviews insercao publica" ON reviews;
DROP POLICY IF EXISTS "Reviews inserção pública" ON reviews;

CREATE POLICY "Reviews insercao validada" ON reviews
FOR INSERT WITH CHECK (
    -- So permite 1 review por booking
    NOT EXISTS (
        SELECT 1 FROM reviews r
        WHERE r.booking_id = reviews.booking_id
    )
    -- Rating deve ser entre 1 e 5
    AND reviews.rating >= 1
    AND reviews.rating <= 5
);


-- =========================================================================
-- 6. ADICIONAR VITE_GOOGLE_PLACE_ID NO .env (OPCIONAL)
-- =========================================================================
-- Se quiser que o link de avaliacao Google funcione:
-- 1. Busque o Place ID da barbearia no Google Maps
-- 2. Adicione no .env: VITE_GOOGLE_PLACE_ID=seu_place_id
-- 3. Faca redeploy
--
-- Para encontrar o Place ID:
-- Acesse https://developers.google.com/maps/documentation/places/web-service/place-id
-- e busque pelo endereco da barbearia.


-- =========================================================================
-- PRONTO! Execute este script no SQL Editor do Supabase.
-- =========================================================================
