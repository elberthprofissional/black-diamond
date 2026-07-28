-- Wrapper function to match front‑end call signature
-- Expected order: barber_id, cliente_email, cliente_nome, cliente_telefone,
-- coupon_id, data, discount_amount, duracao_total, hora, preco_total, servicos
CREATE OR REPLACE FUNCTION public.criar_agendamento_rate_limited(
    p_barber_id uuid,
    p_cliente_email text,
    p_cliente_nome text,
    p_cliente_telefone text,
    p_coupon_id uuid,
    p_data date,
    p_discount_amount numeric,
    p_duracao_total integer,
    p_hora time,
    p_preco_total numeric,
    p_servicos uuid[]
) RETURNS jsonb AS $$
BEGIN
    -- Delegate to the original implementation (parameter order differs)
    RETURN public.criar_agendamento_rate_limited(
        p_cliente_nome,
        p_cliente_telefone,
        p_servicos,
        p_data,
        p_hora,
        p_preco_total,
        p_duracao_total,
        p_cliente_email,
        p_coupon_id,
        p_discount_amount,
        p_barber_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.criar_agendamento_rate_limited(uuid, text, text, text, uuid, date, numeric, integer, time, numeric, uuid[]) TO anon, authenticated;
