-- =========================================================================
-- BLACK DIAMOND - 007 - ESCONTE POR BARBEIRO (RLS MULTI-BARBEIRO)
-- =========================================================================
-- Contexto: a v3.36 traz de volta o multi-barbeiro (cliente escolhe o
-- barbeiro; cada barbeiro tem login próprio). A policy "Agendamentos
-- gerenciamento admin" (001/006) dava leitura/escrita TOTAL a qualquer
-- admin autenticado — o filtro por barbeiro do frontend era só cosmético.
--
-- Esta migration transforma o escopo em regra de banco:
--   • DONO (barbers.is_owner = true — ex.: Tato)  → vê e gerencia TUDO
--   • BARBEIRO COMUM (barbers.user_id = auth.uid()) → vê/gerencia apenas os
--     agendamentos com barber_id = o dele
--   • Admin SEM vínculo na tabela barbers → não vê NADA de bookings
--     (fail-closed; evita "admin fantasma" lendo tudo silenciosamente)
--
-- A leitura pública do site (anon) NÃO muda — continua pela policy
-- "Leitura publica agendamentos" (status/data).
--
-- ⚠️  Execute no SQL Editor do Supabase (depois das migrations 001-006).
--     Reversão: rodar o bloco comentado no final deste arquivo.
--     Valide com: node scripts/audit-rls.mjs
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. FUNÇÕES AUXILIARES
-- ──────────────────────────────────────────────────────────────────────
-- O admin logado é dono? (é o barbeiro chefe — vê tudo)
CREATE OR REPLACE FUNCTION public.is_barber_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbers
    WHERE user_id = auth.uid() AND is_owner = true
  );
$$;

-- ID do barbeiro vinculado ao usuário logado (null se não vinculado)
CREATE OR REPLACE FUNCTION public.current_barber_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_barber_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_barber_id() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 2. SUBSTITUIR A POLICY ADMIN DE BOOKINGS PELO ESCOPO POR BARBEIRO
--    (a antiga "Agendamentos gerenciamento admin" dava tudo a todo admin)
-- ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Agendamentos gerenciamento admin" ON public.bookings;

-- Leitura: dono vê tudo; barbeiro comum vê só os próprios
CREATE POLICY "Agendamentos leitura por barbeiro" ON public.bookings
FOR SELECT TO authenticated
USING (
  is_admin()
  AND (is_barber_owner() OR barber_id = current_barber_id())
);

-- Inserção: dono agenda para qualquer barbeiro; barbeiro comum só para si
CREATE POLICY "Agendamentos criacao admin" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
  is_admin()
  AND (is_barber_owner() OR barber_id = current_barber_id())
);

-- Atualização (ex.: status, reagendamento): escopo igual ao SELECT
CREATE POLICY "Agendamentos edicao admin" ON public.bookings
FOR UPDATE TO authenticated
USING (
  is_admin()
  AND (is_barber_owner() OR barber_id = current_barber_id())
)
WITH CHECK (
  is_admin()
  AND (is_barber_owner() OR barber_id = current_barber_id())
);

-- Exclusão: escopo igual ao SELECT
CREATE POLICY "Agendamentos exclusao admin" ON public.bookings
FOR DELETE TO authenticated
USING (
  is_admin()
  AND (is_barber_owner() OR barber_id = current_barber_id())
);

-- ──────────────────────────────────────────────────────────────────────
-- 3. VALIDAÇÃO MANUAL (opcional — rode no SQL Editor para conferir):
--
--    -- Como um barbeiro comum (troque pelo user_id real do novo barbeiro):
--    SET LOCAL ROLE authenticated;
--    SET LOCAL request.jwt.claims = '{"sub":"<user_id-do-barbeiro>"}';
--    SELECT count(*) FROM bookings;  -- só os agendamentos DELE
--    RESET ROLE;
--
-- ──────────────────────────────────────────────────────────────────────
-- REVERSÃO (se precisar voltar ao comportamento antigo):
--
--   DROP POLICY IF EXISTS "Agendamentos leitura por barbeiro" ON public.bookings;
--   DROP POLICY IF EXISTS "Agendamentos criacao admin" ON public.bookings;
--   DROP POLICY IF EXISTS "Agendamentos edicao admin" ON public.bookings;
--   DROP POLICY IF EXISTS "Agendamentos exclusao admin" ON public.bookings;
--   CREATE POLICY "Agendamentos gerenciamento admin" ON public.bookings
--   FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
-- ──────────────────────────────────────────────────────────────────────
