-- =========================================================================
-- BLACK DIAMOND - 019 - INTEGRAÇÃO CONTA DO CLIENTE COM SUPABASE AUTH
-- =========================================================================
-- Requisitos:
--   1. Tabela `clients` possui `user_id` (UUID -> auth.users) nullable.
--   2. Permite clientes sem conta (user_id = NULL).
--   3. Ao criar conta no Supabase Auth, vincula user_id ao cliente existente pelo WhatsApp/E-mail ou cria novo.
--   4. RLS estrito: Cliente logado só acessa seus próprios dados e agendamentos.
-- =========================================================================

-- 1. Coluna user_id em clients e bookings (se ainda não existir)
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- 2. RPC para sincronizar/vincular Supabase Auth user_id à tabela clients (sem duplicatas)
CREATE OR REPLACE FUNCTION public.sync_client_user(
    p_name text,
    p_phone text,
    p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id uuid;
    v_clean_phone text;
    v_clean_email text;
    v_clean_name text;
    v_client public.clients%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Usuário não autenticado.');
    END IF;

    v_clean_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    v_clean_email := lower(trim(coalesce(p_email, '')));
    v_clean_name := trim(coalesce(p_name, ''));

    -- 1. Verifica se o user_id já está vinculado a um registro em clients
    SELECT * INTO v_client
    FROM public.clients
    WHERE user_id = v_user_id AND deleted_at IS NULL
    LIMIT 1;

    IF FOUND THEN
        -- Atualiza nome, telefone ou e-mail caso tenham mudado
        UPDATE public.clients
        SET name = CASE WHEN v_clean_name <> '' THEN v_clean_name ELSE name END,
            phone = CASE WHEN length(v_clean_phone) >= 10 THEN v_clean_phone ELSE phone END,
            email = CASE WHEN v_clean_email <> '' THEN v_clean_email ELSE email END
        WHERE id = v_client.id
        RETURNING * INTO v_client;

        RETURN jsonb_build_object(
            'ok', true,
            'client_id', v_client.id,
            'name', v_client.name,
            'phone', v_client.phone,
            'email', v_client.email,
            'user_id', v_client.user_id
        );
    END IF;

    -- 2. Se não está vinculado por user_id, busca por WhatsApp (telefone) existente
    IF length(v_clean_phone) >= 10 THEN
        SELECT * INTO v_client
        FROM public.clients
        WHERE phone = v_clean_phone AND deleted_at IS NULL
        LIMIT 1;
    END IF;

    -- 3. Se não achou por telefone, tenta por e-mail
    IF v_client.id IS NULL AND v_clean_email <> '' THEN
        SELECT * INTO v_client
        FROM public.clients
        WHERE lower(email) = v_clean_email AND deleted_at IS NULL
        LIMIT 1;
    END IF;

    -- 4. Se achou um cliente existente sem user_id (ou com user_id nulo), vincula!
    IF v_client.id IS NOT NULL THEN
        UPDATE public.clients
        SET user_id = v_user_id,
            email = CASE WHEN v_clean_email <> '' THEN v_clean_email ELSE email END,
            name = CASE WHEN v_clean_name <> '' THEN v_clean_name ELSE name END
        WHERE id = v_client.id
        RETURNING * INTO v_client;

        RETURN jsonb_build_object(
            'ok', true,
            'client_id', v_client.id,
            'name', v_client.name,
            'phone', v_client.phone,
            'email', v_client.email,
            'user_id', v_client.user_id,
            'linked', true
        );
    END IF;

    -- 5. Caso contrário, cria um novo cliente vinculado ao user_id
    INSERT INTO public.clients (
        name,
        phone,
        email,
        user_id
    ) VALUES (
        CASE WHEN v_clean_name <> '' THEN v_clean_name ELSE 'Cliente' END,
        v_clean_phone,
        NULLIF(v_clean_email, ''),
        v_user_id
    )
    RETURNING * INTO v_client;

    RETURN jsonb_build_object(
        'ok', true,
        'client_id', v_client.id,
        'name', v_client.name,
        'phone', v_client.phone,
        'email', v_client.email,
        'user_id', v_client.user_id,
        'created', true
    );
END;
$$;

-- 3. RPC para buscar perfil do cliente logado (get_my_client_profile)
CREATE OR REPLACE FUNCTION public.get_my_client_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id uuid;
    v_client public.clients%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Não autenticado');
    END IF;

    SELECT * INTO v_client
    FROM public.clients
    WHERE user_id = v_user_id AND deleted_at IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Perfil de cliente não encontrado');
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'client_id', v_client.id,
        'name', v_client.name,
        'phone', v_client.phone,
        'email', v_client.email,
        'is_mensalista', v_client.is_mensalista,
        'loyalty_stamps', coalesce(v_client.loyalty_stamps, 0),
        'created_at', v_client.created_at
    );
END;
$$;

-- 4. RPC para buscar agendamentos do cliente logado (get_my_client_bookings)
CREATE OR REPLACE FUNCTION public.get_my_client_bookings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id uuid;
    v_client_id uuid;
    v_bookings jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Não autenticado');
    END IF;

    SELECT id INTO v_client_id
    FROM public.clients
    WHERE user_id = v_user_id AND deleted_at IS NULL
    LIMIT 1;

    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('ok', true, 'bookings', '[]'::jsonb);
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', b.id,
            'booking_date', b.booking_date,
            'booking_time', b.booking_time,
            'status', b.status,
            'total_price', b.total_price,
            'service_name', s.name,
            'barber_name', barb.name,
            'created_at', b.created_at
        ) ORDER BY b.booking_date DESC, b.booking_time DESC
    ) INTO v_bookings
    FROM public.bookings b
    LEFT JOIN public.services s ON s.id = b.service_id
    LEFT JOIN public.barbers barb ON barb.id = b.barber_id
    WHERE b.client_id = v_client_id OR b.user_id = v_user_id;

    RETURN jsonb_build_object(
        'ok', true,
        'bookings', coalesce(v_bookings, '[]'::jsonb)
    );
END;
$$;

-- 5. Atualizar RLS da tabela public.clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients select own or admin" ON public.clients;
CREATE POLICY "Clients select own or admin" ON public.clients
    FOR SELECT
    USING (
        public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Clients update own or admin" ON public.clients;
CREATE POLICY "Clients update own or admin" ON public.clients
    FOR UPDATE
    USING (
        public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    )
    WITH CHECK (
        public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );

-- 6. Atualizar RLS da tabela public.bookings para clientes logados
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bookings select client or admin" ON public.bookings;
CREATE POLICY "Bookings select client or admin" ON public.bookings
    FOR SELECT
    USING (
        public.is_admin() OR 
        (auth.uid() IS NOT NULL AND (
            user_id = auth.uid() OR 
            client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
        ))
    );

DROP POLICY IF EXISTS "Bookings update client or admin" ON public.bookings;
CREATE POLICY "Bookings update client or admin" ON public.bookings
    FOR UPDATE
    USING (
        public.is_admin() OR 
        (auth.uid() IS NOT NULL AND (
            user_id = auth.uid() OR 
            client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
        ))
    );

GRANT EXECUTE ON FUNCTION public.sync_client_user(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_my_client_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_client_bookings() TO authenticated;
