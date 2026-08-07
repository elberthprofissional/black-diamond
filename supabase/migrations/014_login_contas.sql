-- =========================================================================
-- BLACK DIAMOND - 014 - PORTAS DE ACESSO: CONTA DO CLIENTE + RESOLVEDOR
-- =========================================================================
-- Contexto: o cliente entrava só com celular (sem senha). Agora:
--   1. `clients` ganha password_hash (bcrypt) — conta OPCIONAL do cliente.
--      Quem não criar senha continua entrando só com o celular (atrito zero).
--   2. Barbeiro/admin pode entrar por NOME, TELEFONE ou E-MAIL + senha:
--      `resolver_login_profissional` acha a conta e devolve o e-mail do auth.
--
-- Segurança:
--   - Senha SEMPRE bcrypt (pgcrypto.crypt/gen_salt) — nunca texto puro.
--   - RPCs SECURITY DEFINER com search_path controlado.
--   - Celular NUNCA dá acesso administrativo (resolver só devolve e-mail).
--   - Rate limit via check_rate_limit (já existente) no login por senha.
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 0. EXTENSÃO pgcrypto (bcrypt) — se já existir, não faz nada
-- ──────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- 1. COLUNAS DE CONTA NA TABELA clients
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS password_hash text,
    ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

-- ──────────────────────────────────────────────────────────────────────
-- 2. RPC: criar/alterar senha do cliente (bcrypt)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.criar_senha_cliente(p_phone text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_client_id uuid;
    v_name text;
    v_allowed boolean;
BEGIN
    p_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

    IF length(p_phone) < 11 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;

    IF p_password IS NULL OR length(p_password) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'A senha precisa ter pelo menos 6 caracteres.');
    END IF;

    -- Rate limit: máx 5 tentativas por minuto
    BEGIN
        SELECT public.check_rate_limit('criar_senha_cliente', 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    SELECT id, name INTO v_client_id, v_name
    FROM public.clients
    WHERE phone = p_phone AND deleted_at IS NULL
    LIMIT 1;

    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado. Faça um agendamento primeiro.');
    END IF;

    UPDATE public.clients
    SET password_hash = crypt(p_password, gen_salt('bf', 10)),
        password_set_at = now()
    WHERE id = v_client_id;

    RETURN jsonb_build_object('ok', true, 'name', v_name, 'has_password', true);
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 3. RPC: verificar senha do cliente (login por celular/nome + senha)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verificar_senha_cliente(p_phone text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_client public.clients%ROWTYPE;
    v_allowed boolean;
BEGIN
    p_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

    IF length(p_phone) < 11 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;

    SELECT * INTO v_client
    FROM public.clients
    WHERE phone = p_phone AND deleted_at IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    IF v_client.password_hash IS NULL THEN
        -- Cliente não tem senha → o app entra direto (atrito zero)
        RETURN jsonb_build_object(
            'ok', false,
            'needs_password', false,
            'name', v_client.name,
            'message', 'Cliente sem senha.'
        );
    END IF;

    -- Rate limit no login por senha
    BEGIN
        SELECT public.check_rate_limit('login_cliente', 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'needs_password', true, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    IF v_client.password_hash = crypt(coalesce(p_password, ''), v_client.password_hash) THEN
        RETURN jsonb_build_object(
            'ok', true,
            'client_id', v_client.id,
            'name', v_client.name,
            'phone', v_client.phone,
            'needs_password', true
        );
    END IF;

    RETURN jsonb_build_object('ok', false, 'needs_password', true, 'message', 'Senha incorreta.');
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 4. RPC: buscar clientes por NOME (login por nome + desambiguação)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.buscar_cliente_por_nome(p_nome text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_matches jsonb;
BEGIN
    v_matches := (
        SELECT jsonb_agg(row_to_json(t))
        FROM (
            SELECT
                c.id,
                c.name,
                c.phone,
                '(' || left(regexp_replace(c.phone, '\D', '', 'g'), 2)
                    || ') *****-**'
                    || right(regexp_replace(c.phone, '\D', '', 'g'), 2) AS phone_masked,
                (c.password_hash IS NOT NULL) AS has_password
            FROM public.clients c
            WHERE c.deleted_at IS NULL
              AND (
                  lower(c.name) LIKE lower(trim(p_nome)) || '%'
                  OR lower(c.name) = lower(trim(p_nome))
              )
            ORDER BY c.name
            LIMIT 5
        ) t
    );
    RETURN coalesce(v_matches, jsonb_build_array());
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 5. RPC: resolvedor de identidade para PROFISSIONAIS (barbeiros/admins)
--    Entrada: nome, telefone ou e-mail. Saída: {type, email, name, phone}
--    O e-mail devolvido alimenta o signInWithPassword do Supabase Auth.
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolver_login_profissional(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_email text;
    v_name text;
    v_phone text;
    v_count integer;
    v_digits text;
BEGIN
    p_identifier := trim(coalesce(p_identifier, ''));

    IF p_identifier = '' THEN
        RETURN jsonb_build_object('type', 'none');
    END IF;

    -- 1. E-MAIL (contém @)
    IF p_identifier LIKE '%@%' THEN
        SELECT u.email, b.name, b.phone INTO v_email, v_name, v_phone
        FROM public.barbers b
        JOIN auth.users u ON u.id = b.user_id
        WHERE lower(u.email) = lower(p_identifier) AND b.is_active = true
        LIMIT 1;
        IF FOUND THEN
            RETURN jsonb_build_object('type', 'profissional', 'email', v_email, 'name', v_name, 'phone', v_phone);
        END IF;
        RETURN jsonb_build_object('type', 'none');
    END IF;

    -- 2. TELEFONE (só dígitos)
    IF p_identifier ~ '^[0-9+()\- ]+$' THEN
        v_digits := regexp_replace(p_identifier, '\D', '', 'g');
        SELECT u.email, b.name, b.phone INTO v_email, v_name, v_phone
        FROM public.barbers b
        JOIN auth.users u ON u.id = b.user_id
        WHERE regexp_replace(coalesce(b.phone, ''), '\D', '', 'g') = v_digits
          AND b.is_active = true
        LIMIT 1;
        IF FOUND THEN
            RETURN jsonb_build_object('type', 'profissional', 'email', v_email, 'name', v_name, 'phone', v_phone);
        END IF;
        RETURN jsonb_build_object('type', 'none');
    END IF;

    -- 3. NOME (sem @ e sem dígitos)
    SELECT count(*) INTO v_count
    FROM public.barbers
    WHERE lower(name) = lower(p_identifier) AND is_active = true;

    IF v_count = 1 THEN
        SELECT u.email, b.name, b.phone INTO v_email, v_name, v_phone
        FROM public.barbers b
        JOIN auth.users u ON u.id = b.user_id
        WHERE lower(b.name) = lower(p_identifier) AND b.is_active = true
        LIMIT 1;
        RETURN jsonb_build_object('type', 'profissional', 'email', v_email, 'name', v_name, 'phone', v_phone);
    ELSIF v_count > 1 THEN
        -- Ambiguidade: devolve a lista para o app desambiguar
        RETURN jsonb_build_object('type', 'ambiguous', 'matches', (
            SELECT jsonb_agg(jsonb_build_object(
                'email', u.email,
                'name', b.name,
                'phone', b.phone
            ))
            FROM public.barbers b
            JOIN auth.users u ON u.id = b.user_id
            WHERE lower(b.name) = lower(p_identifier) AND b.is_active = true
        ));
    END IF;

    RETURN jsonb_build_object('type', 'none');
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 6. GRANTS — acesso público (anon) e autenticado
-- ──────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.criar_senha_cliente(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_senha_cliente(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_cliente_por_nome(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_login_profissional(text) TO anon, authenticated;
