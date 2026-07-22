-- =========================================================================
-- CONFIGURAR ADMINS E BARBEIROS
-- =========================================================================
-- Execute este SQL INTEIRO no SQL Editor do Supabase (uma vez só)
-- =========================================================================

-- 1. Adicionar coluna is_hidden na tabela barbers (pra você ficar invisível)
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 2. Atualizar o RPC get_barbers pra NÃO mostrar barbeiros ocultos
CREATE OR REPLACE FUNCTION get_barbers()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    phone TEXT,
    photo_url TEXT,
    bio TEXT,
    quote TEXT,
    is_active BOOLEAN,
    is_owner BOOLEAN,
    sort_order INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.user_id, b.name, b.phone, b.photo_url, b.bio, b.quote,
           b.is_active, b.is_owner, b.sort_order, b.created_at
    FROM barbers b
    WHERE b.is_active = TRUE
      AND (b.is_hidden IS NULL OR b.is_hidden = FALSE)  -- ← não mostra hidden
    ORDER BY b.sort_order ASC, b.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Descobrir os IDs dos usuários no Auth
-- (substitua pelos IDs reais se esses SELECTs não acharem)
DO $$
DECLARE
    v_tato_id UUID;
    v_elberth_id UUID;
    v_tato_barber_id UUID;
BEGIN
    -- Busca IDs dos usuários pelo email
    SELECT id INTO v_tato_id FROM auth.users WHERE email = 'aguirrestarlyn645@gmail.com';
    SELECT id INTO v_elberth_id FROM auth.users WHERE email = 'elberthmayan2007@gmail.com';

    -- Se não achou, cria os usuários
    IF v_tato_id IS NULL THEN
        INSERT INTO auth.users (email, email_confirmed_at, encrypted_password, raw_user_meta_data)
        VALUES ('aguirrestarlyn645@gmail.com', NOW(), 
                crypt('BlackDiamond123!', gen_salt('bf')),
                '{"full_name":"Tato"}'::jsonb)
        RETURNING id INTO v_tato_id;
        RAISE NOTICE 'Usuário Tato criado: %', v_tato_id;
    ELSE
        RAISE NOTICE 'Tato já existe: %', v_tato_id;
    END IF;

    IF v_elberth_id IS NULL THEN
        INSERT INTO auth.users (email, email_confirmed_at, encrypted_password, raw_user_meta_data)
        VALUES ('elberthmayan2007@gmail.com', NOW(),
                crypt('BlackDiamond123!', gen_salt('bf')),
                '{"full_name":"Elberth"}'::jsonb)
        RETURNING id INTO v_elberth_id;
        RAISE NOTICE 'Usuário Elberth criado: %', v_elberth_id;
    ELSE
        RAISE NOTICE 'Elberth já existe: %', v_elberth_id;
    END IF;

    -- 4. Garantir que estão em admin_users
    INSERT INTO admin_users (user_id) VALUES (v_tato_id) ON CONFLICT DO NOTHING;
    INSERT INTO admin_users (user_id) VALUES (v_elberth_id) ON CONFLICT DO NOTHING;
    RAISE NOTICE 'admin_users garantidos para ambos.';

    -- 5. Verificar se Tato já tem registro em barbers
    SELECT id INTO v_tato_barber_id FROM barbers WHERE user_id = v_tato_id;
    
    IF v_tato_barber_id IS NULL THEN
        -- Cria o Tato como DONO (visível, com estrelinha)
        INSERT INTO barbers (user_id, name, phone, bio, quote, is_active, is_owner, sort_order, is_hidden)
        VALUES (v_tato_id, 'Tato', '4399553590', 
                'Dono da Black Diamond - Profissional apaixonado pelo que faz!',
                '"Não sou o melhor, mas sou o melhor para você."',
                TRUE, TRUE, 0, FALSE);
        RAISE NOTICE 'Barber Tato criado como DONO.';
    ELSE
        -- Já existe, só atualiza pra dono
        UPDATE barbers 
        SET is_owner = TRUE, is_active = TRUE, is_hidden = FALSE
        WHERE id = v_tato_barber_id;
        RAISE NOTICE 'Barber Tato atualizado para DONO.';
    END IF;

    -- 6. Criar Elberth como admin INVISÍVEL
    -- (não aparece na lista de barbeiros, mas tem acesso total ao admin)
    IF NOT EXISTS (SELECT 1 FROM barbers WHERE user_id = v_elberth_id) THEN
        INSERT INTO barbers (user_id, name, phone, bio, quote, is_active, is_owner, sort_order, is_hidden)
        VALUES (v_elberth_id, 'Elberth (Dev)', '', 
                'Desenvolvedor - suporte técnico',
                '',
                TRUE, TRUE, 99, TRUE);  -- ← is_hidden = TRUE (invisível)
        RAISE NOTICE 'Barber Elberth criado como INVISÍVEL.';
    ELSE
        UPDATE barbers 
        SET is_owner = TRUE, is_hidden = TRUE
        WHERE user_id = v_elberth_id;
        RAISE NOTICE 'Barber Elberth atualizado para INVISÍVEL.';
    END IF;

    -- 7. Aplicar unique constraint em services.name (migration 009)
    -- Remove duplicatas primeiro, depois adiciona constraint
    DELETE FROM services a USING services b
    WHERE a.id > b.id AND a.name = b.name;
    
    -- Só adiciona se não existir ainda
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_services_name' AND connamespace = 'public'::regnamespace
    ) THEN
        ALTER TABLE services ADD CONSTRAINT uq_services_name UNIQUE (name);
        RAISE NOTICE 'Unique constraint UQ_SERVICES_NAME adicionada.';
    ELSE
        RAISE NOTICE 'Unique constraint UQ_SERVICES_NAME já existe.';
    END IF;

    -- 8. Inserir cupom BEMVINDO se não existir
    INSERT INTO coupons (code, description, discount_type, discount_value, valid_from, valid_until, max_uses, is_active)
    SELECT 'BEMVINDO', 'Desconto de R$10 na primeira visita!', 'fixed', 10.00, 
           CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 50, true
    WHERE NOT EXISTS (SELECT 1 FROM coupons WHERE code = 'BEMVINDO');
    
    RAISE NOTICE 'Cupom BEMVINDO garantido.';
    
END $$;

-- 9. Mostrar resultado final
SELECT '✅ CONFIGURAÇÃO CONCLUÍDA!' as status;

SELECT id, name, is_owner, is_hidden, is_active 
FROM barbers 
ORDER BY sort_order ASC;
