-- =========================================================================
-- BLACK DIAMOND - 006 - RLS ESTRITO + RPCS PÚBLICAS SEGURAS
-- =========================================================================
-- Correção de segurança encontrada na auditoria de 2026-08-05:
--   🚨 A chave anon (pública) conseguia LER todos os clientes
--      (nome, telefone, e-mail, notas) — vazamento de dados pessoais.
--   🚨 A chave anon conseguia ESCREVER em clients (INSERT/UPDATE/DELETE).
--   🚨 A chave anon conseguia criar bookings direto na tabela,
--      pulando a RPC criar_agendamento (validação de horário, cupom,
--      mensalista e rate limiting).
--
-- O que este migration faz:
--   1. Remove policies RLS permissivas órfãs em clients e bookings
--      (mantém apenas as policies oficiais da migration 001).
--   2. Habilita RLS em clients e bookings.
--   3. Recria as policies oficiais:
--        - clients  → apenas admin (authenticated + is_admin())
--        - bookings → admin full + leitura pública filtrada por status/data
--   4. Cria a RPC pública SEGURA cadastrar_cliente_publico()
--      (upsert idempotente por telefone) — substitui o INSERT direto
--      que o frontend fazia no fluxo "Sou novo aqui".
--   5. Cria a RPC pública SEGURA get_client_dashboard()
--      (stats + histórico do cliente via SECURITY DEFINER) — substitui as
--      leituras diretas da página /cliente.
--
-- ⚠️  Execute TUDO no SQL Editor do Supabase (em ordem).
--     Depois valide com: node scripts/audit-rls.mjs
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. REMOVER POLICIES PERMISSIVAS ÓRFÃS (clients e bookings)
--    Mantém apenas as policies oficiais declaradas na migration 001.
-- ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname
           FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename IN ('clients', 'bookings')
  LOOP
    IF p.policyname::text NOT IN (
      'Clientes gerenciamento admin',
      'Agendamentos gerenciamento admin',
      'Leitura publica agendamentos'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    END IF;
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────────────
-- 2. HABILITAR RLS (idempotente)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────
-- 3. POLICIES OFICIAIS — CLIENTS (apenas admin)
-- ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clientes gerenciamento admin" ON public.clients;
CREATE POLICY "Clientes gerenciamento admin" ON public.clients
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- 4. POLICIES OFICIAIS — BOOKINGS (admin full + leitura pública)
-- ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Agendamentos gerenciamento admin" ON public.bookings;
CREATE POLICY "Agendamentos gerenciamento admin" ON public.bookings
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Leitura publica agendamentos" ON public.bookings;
CREATE POLICY "Leitura publica agendamentos" ON public.bookings
FOR SELECT
USING (
  (status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE)
  OR status = 'completed'
);

-- ──────────────────────────────────────────────────────────────────────
-- 5. RPC PÚBLICA: cadastrar_cliente_publico (upsert idempotente)
--    SECURITY DEFINER → roda como dono da tabela, sem expor a tabela.
--    Substitui o INSERT direto do BookingPreScreen ("Sou novo aqui").
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cadastrar_cliente_publico(
  p_nome text,
  p_telefone text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
  v_nome text := TRIM(p_nome);
  v_phone text := regexp_replace(p_telefone, '\D', '', 'g');
BEGIN
  -- Rate limit por IP (convenção do projeto: RPCs públicas de telefone usam check_rate_limit)
  IF NOT check_rate_limit('cadastrar_cliente', 5, 60) THEN
    RAISE EXCEPTION 'Muitas tentativas. Aguarde 1 minuto e tente novamente.';
  END IF;

  IF v_nome = '' OR length(v_nome) < 2 THEN
    RAISE EXCEPTION 'Nome do cliente invalido (minimo de 2 caracteres).';
  END IF;
  IF v_phone !~ '^[0-9]{10,15}$' THEN
    RAISE EXCEPTION 'Numero de telefone invalido (deve conter apenas numeros e ter entre 10 e 15 digitos).';
  END IF;

  SELECT id INTO v_client_id FROM clients WHERE phone = v_phone LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (name, phone)
    VALUES (v_nome, v_phone)
    RETURNING id INTO v_client_id;
  END IF;

  RETURN jsonb_build_object('id', v_client_id, 'name', v_nome, 'phone', v_phone);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cadastrar_cliente_publico(text, text) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 6. RPC PÚBLICA: get_client_dashboard (stats + histórico)
--    SECURITY DEFINER → só retorna os dados do telefone informado,
--    sem nunca expor a tabela clients inteira.
--    Substitui as leituras diretas do ClientProfile (/cliente).
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_client_dashboard(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_phone text := regexp_replace(p_phone, '\D', '', 'g');
  v_client_id uuid;
  v_stats jsonb;
  v_history jsonb;
BEGIN
  -- Rate limit por telefone (convenção do projeto)
  IF NOT check_rate_limit('client_dashboard:' || v_phone, 10, 60) THEN
    RAISE EXCEPTION 'Muitas tentativas. Aguarde 1 minuto e tente novamente.';
  END IF;

  IF v_phone !~ '^[0-9]{10,15}$' THEN
    RETURN jsonb_build_object('stats', NULL, 'history', '[]'::jsonb);
  END IF;

  SELECT id INTO v_client_id FROM clients WHERE phone = v_phone LIMIT 1;
  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('stats', NULL, 'history', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'historical_visits', COALESCE(historical_visits, 0),
    'historical_spent', COALESCE(historical_spent, 0),
    'last_visit_date', last_visit_date,
    'is_mensalista', is_mensalista,
    'mensalista_plan_id', mensalista_plan_id,
    'mensalista_expires_at', mensalista_expires_at
  ) INTO v_stats
  FROM clients WHERE id = v_client_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'booking_date', b.booking_date,
    'booking_time', b.booking_time,
    'status', b.status,
    'total_price', b.total_price,
    'total_duration', b.total_duration,
    'service_ids', b.service_ids
  ) ORDER BY b.booking_date DESC, b.booking_time DESC), '[]'::jsonb) INTO v_history
  FROM bookings b
  WHERE b.client_id = v_client_id
    AND b.status IN ('completed', 'cancelled')
  LIMIT 50;

  RETURN jsonb_build_object('stats', v_stats, 'history', v_history);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_dashboard(text) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 7. FIX: check_client_no_show_block (recreada como no-op)
--    A migration 005 dropou esta funcao, mas criar_agendamento_rate_limited
--    (002/004) ainda a chama para clientes existentes — causando o erro:
--      "function check_client_no_show_block(uuid) does not exist"
--    Como o bloqueio automatico por faltas foi DESATIVADO (v3.31 — so notifica),
--    a funcao e recriada como no-op. is_client_blocked_by_no_show permanece
--    removida (nenhum codigo a chama mais).
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_client_no_show_block(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- No-op intencional: bloqueio automatico por faltas desativado (v3.31+).
    -- O limite de faltas (settings.max_no_shows) so gera notificacao.
    RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_client_no_show_block(uuid) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 8. VALIDAÇÃO MANUAL (opcional — rode no SQL Editor para conferir):
--
--    SET ROLE anon;
--    SELECT count(*) FROM clients;   -- deve ser 0 (anon perdeu leitura)
--    SELECT count(*) FROM bookings;  -- apenas públicos (design)
--    SELECT public.cadastrar_cliente_publico('Teste', '31999999999'); -- upsert ok
--    SELECT public.get_client_dashboard('31999999999');              -- ok
--    RESET ROLE;
-- ──────────────────────────────────────────────────────────────────────
