-- =========================================================================
-- BLACK DIAMOND - 016 - CONTA DO CLIENTE + RECUPERAÇÃO DE SENHA
-- =========================================================================
-- Turbina o login de cliente (que já é por telefone + senha bcrypt opcional):
--   1. Recuperação de senha por CÓDIGO (6 dígitos, expira em 15 min, hash
--      sha256 no banco). A entrega do código é feita pela edge function
--      `cliente-recuperar-senha` (e-mail grátis via MailerSend).
--   2. Conta completa: criar conta com nome + e-mail + telefone + senha
--      (herda o histórico se o telefone já existe) e login por e-mail OU
--      telefone.
--   3. Admin pode limpar a senha de um cliente (fallback de recuperação).
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. Tabela de tokens de recuperação (RLS ON, sem policies → só service
--    role/edge function acessa; anon não enxerga nada)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_reset_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_reset_tokens_client ON client_reset_tokens(client_id);

ALTER TABLE client_reset_tokens ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────
-- 2. verificar_login_cliente — login por telefone OU e-mail + senha
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION verificar_login_cliente(p_identifier text, p_password text)
RETURNS jsonb AS $$
DECLARE
    v_client public.clients%ROWTYPE;
    v_allowed boolean;
    v_ident text;
BEGIN
    v_ident := regexp_replace(coalesce(p_identifier, ''), '\s', '', 'g');
    IF v_ident = '' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Informe telefone ou e-mail.');
    END IF;

    IF v_ident LIKE '%@%' THEN
        SELECT * INTO v_client FROM public.clients
        WHERE lower(email) = lower(v_ident) AND deleted_at IS NULL LIMIT 1;
    ELSE
        v_ident := regexp_replace(v_ident, '\D', '', 'g');
        IF length(v_ident) < 11 THEN
            RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
        END IF;
        SELECT * INTO v_client FROM public.clients
        WHERE phone = v_ident AND deleted_at IS NULL LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Não encontramos uma conta com esse telefone/e-mail.');
    END IF;

    IF v_client.password_hash IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 'needs_password', false,
            'name', v_client.name, 'phone', v_client.phone,
            'message', 'Sem senha cadastrada.'
        );
    END IF;

    BEGIN
        SELECT public.check_rate_limit('login_cliente:' || v_client.phone, 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'needs_password', true, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    IF v_client.password_hash = crypt(coalesce(p_password, ''), v_client.password_hash) THEN
        RETURN jsonb_build_object('ok', true, 'name', v_client.name, 'phone', v_client.phone);
    END IF;

    RETURN jsonb_build_object('ok', false, 'needs_password', true, 'message', 'Senha incorreta.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 3. criar_conta_cliente — conta completa (nome + e-mail + telefone + senha)
--    Se o telefone já existe → vincula e herda o histórico.
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION criar_conta_cliente(p_nome text, p_email text, p_telefone text, p_senha text)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
    v_name text;
    v_phone text;
    v_allowed boolean;
    v_existing_id uuid;
    v_existing_hash text;
    v_email_conflict uuid;
BEGIN
    v_name := trim(coalesce(p_nome, ''));
    v_phone := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
    p_email := lower(trim(coalesce(p_email, '')));

    IF length(v_name) < 2 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Informe seu nome.');
    END IF;
    IF length(v_phone) < 10 OR length(v_phone) > 15 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;
    IF p_email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}$' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'E-mail inválido.');
    END IF;
    IF p_senha IS NULL OR length(p_senha) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'A senha precisa ter pelo menos 6 caracteres.');
    END IF;

    BEGIN
        SELECT public.check_rate_limit('criar_conta_cliente', 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    -- E-mail em uso por OUTRO telefone?
    SELECT id INTO v_email_conflict FROM public.clients
    WHERE lower(email) = p_email AND deleted_at IS NULL
      AND (phone IS NULL OR phone <> v_phone)
    LIMIT 1;
    IF v_email_conflict IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Este e-mail já está em uso por outra conta.');
    END IF;

    -- Cliente já existe pelo telefone? → vincula (herda histórico)
    SELECT id, name, password_hash INTO v_existing_id, v_name, v_existing_hash
    FROM public.clients WHERE phone = v_phone AND deleted_at IS NULL LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Segurança: se o telefone já tem senha, NÃO sobrescrever silenciosamente
        -- (evita que alguém que saiba o número tome a conta). Usa o fluxo de login
        -- ou de recuperação por e-mail.
        IF v_existing_hash IS NOT NULL THEN
            RETURN jsonb_build_object(
                'ok', false,
                'message', 'Este telefone já tem uma senha cadastrada. Entre com seu telefone e senha — ou use "Esqueci minha senha".'
            );
        END IF;
        UPDATE public.clients SET
            name = COALESCE(NULLIF(v_name, ''), name),
            email = CASE WHEN email IS NULL OR email = '' THEN p_email ELSE email END,
            password_hash = crypt(p_senha, gen_salt('bf', 10)),
            password_set_at = now()
        WHERE id = v_existing_id;
        RETURN jsonb_build_object('ok', true, 'client_id', v_existing_id, 'name', v_name, 'phone', v_phone, 'message', 'Conta vinculada ao seu histórico!');
    END IF;

    INSERT INTO public.clients (name, email, phone, password_hash, password_set_at)
    VALUES (v_name, p_email, v_phone, crypt(p_senha, gen_salt('bf', 10)), now())
    RETURNING id INTO v_client_id;

    RETURN jsonb_build_object('ok', true, 'client_id', v_client_id, 'name', v_name, 'phone', v_phone, 'message', 'Conta criada!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 4. redefinir_senha_cliente — valida o código e troca a senha (bcrypt)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION redefinir_senha_cliente(p_phone text, p_token text, p_nova_senha text)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
    v_token_hash text;
    v_allowed boolean;
BEGIN
    p_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    p_token := trim(coalesce(p_token, ''));

    IF length(p_phone) < 11 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;
    IF p_token !~ '^[0-9]{6}$' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Código inválido.');
    END IF;
    IF p_nova_senha IS NULL OR length(p_nova_senha) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'A senha precisa ter pelo menos 6 caracteres.');
    END IF;

    BEGIN
        SELECT public.check_rate_limit('redefinir_senha_cliente:' || p_phone, 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    SELECT id INTO v_client_id FROM public.clients
    WHERE phone = p_phone AND deleted_at IS NULL LIMIT 1;
    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

    IF NOT EXISTS (
        SELECT 1 FROM client_reset_tokens t
        WHERE t.client_id = v_client_id
          AND t.token_hash = v_token_hash
          AND t.used_at IS NULL
          AND t.expires_at > now()
    ) THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Código inválido ou expirado. Peça um novo.');
    END IF;

    UPDATE public.clients
    SET password_hash = crypt(p_nova_senha, gen_salt('bf', 10)), password_set_at = now()
    WHERE id = v_client_id;

    UPDATE client_reset_tokens SET used_at = now()
    WHERE client_id = v_client_id AND token_hash = v_token_hash AND used_at IS NULL;

    RETURN jsonb_build_object('ok', true, 'message', 'Senha redefinida!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 5. limpar_senha_cliente — admin reseta o acesso do cliente (fallback)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION limpar_senha_cliente(p_client_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_name text;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem redefinir senha de clientes';
    END IF;

    SELECT name INTO v_name FROM public.clients WHERE id = p_client_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    UPDATE public.clients SET password_hash = NULL, password_set_at = NULL WHERE id = p_client_id;

    RETURN jsonb_build_object('ok', true, 'name', v_name, 'message', 'Senha removida. O cliente entra sem senha e cria uma nova.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 6. atualizar_email_cliente + alterar_senha_cliente (dashboard do cliente)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION atualizar_email_cliente(p_phone text, p_email text)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
    v_allowed boolean;
    v_conflict uuid;
BEGIN
    p_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    p_email := lower(trim(coalesce(p_email, '')));

    IF length(p_phone) < 11 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;
    IF p_email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}$' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'E-mail inválido.');
    END IF;

    BEGIN
        SELECT public.check_rate_limit('atualizar_email:' || p_phone, 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    SELECT id INTO v_client_id FROM public.clients WHERE phone = p_phone AND deleted_at IS NULL LIMIT 1;
    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    SELECT id INTO v_conflict FROM public.clients
    WHERE lower(email) = p_email AND id <> v_client_id AND deleted_at IS NULL LIMIT 1;
    IF v_conflict IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Este e-mail já está em uso por outra conta.');
    END IF;

    UPDATE public.clients SET email = p_email WHERE id = v_client_id;
    RETURN jsonb_build_object('ok', true, 'email', p_email, 'message', 'E-mail atualizado!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION alterar_senha_cliente(p_phone text, p_senha_atual text, p_nova_senha text)
RETURNS jsonb AS $$
DECLARE
    v_client public.clients%ROWTYPE;
    v_allowed boolean;
BEGIN
    p_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

    IF length(p_phone) < 11 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Telefone inválido.');
    END IF;
    IF p_nova_senha IS NULL OR length(p_nova_senha) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'A nova senha precisa ter pelo menos 6 caracteres.');
    END IF;

    BEGIN
        SELECT public.check_rate_limit('alterar_senha:' || p_phone, 5, 60) INTO v_allowed;
    EXCEPTION WHEN OTHERS THEN
        v_allowed := true;
    END;
    IF v_allowed IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Muitas tentativas. Aguarde 1 minuto.');
    END IF;

    SELECT * INTO v_client FROM public.clients WHERE phone = p_phone AND deleted_at IS NULL LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cliente não encontrado.');
    END IF;

    IF v_client.password_hash IS NULL OR v_client.password_hash <> crypt(coalesce(p_senha_atual, ''), v_client.password_hash) THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Senha atual incorreta.');
    END IF;

    UPDATE public.clients
    SET password_hash = crypt(p_nova_senha, gen_salt('bf', 10)), password_set_at = now()
    WHERE id = v_client.id;

    RETURN jsonb_build_object('ok', true, 'message', 'Senha alterada!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 7. Grants
-- ──────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION verificar_login_cliente(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION criar_conta_cliente(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION redefinir_senha_cliente(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION atualizar_email_cliente(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION alterar_senha_cliente(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION limpar_senha_cliente(uuid) TO authenticated;
