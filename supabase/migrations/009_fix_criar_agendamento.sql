-- =========================================================================
-- BLACK DIAMOND - 009 - FIX: criar_agendamento_rate_limited
-- =========================================================================
-- Cria a funcao criar_agendamento_rate_limited que nao foi aplicada
-- no banco remoto. Os parametros nomeados sao os mesmos que o front-end
-- envia via supabase.rpc().
-- =========================================================================

-- Dropar versoes antigas (se existirem)
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text);
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric);

-- Funcao com rate limiting e no-show check
CREATE OR REPLACE FUNCTION criar_agendamento_rate_limited(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time,
    p_preco_total decimal,
    p_duracao_total integer,
    p_cliente_email text DEFAULT NULL,
    p_coupon_id uuid DEFAULT NULL,
    p_discount_amount decimal DEFAULT 0,
    p_barber_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_client_id uuid;
BEGIN
    IF NOT check_rate_limit('criar_agendamento', 3, 60) THEN
        RAISE EXCEPTION 'Muitas tentativas. Aguarde 1 minuto e tente novamente.';
    END IF;

    SELECT id INTO v_client_id FROM clients WHERE phone = p_cliente_telefone LIMIT 1;
    IF v_client_id IS NOT NULL THEN
        PERFORM check_client_no_show_block(v_client_id);
    END IF;

    RETURN criar_agendamento(
        p_cliente_nome, p_cliente_telefone, p_servicos,
        p_data, p_hora, p_preco_total, p_duracao_total, p_cliente_email,
        p_coupon_id, p_barber_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissao para usuarios anonimos e autenticados
GRANT EXECUTE ON FUNCTION criar_agendamento_rate_limited(text, text, uuid[], date, time, numeric, integer, text, uuid, numeric, uuid) TO anon, authenticated;
