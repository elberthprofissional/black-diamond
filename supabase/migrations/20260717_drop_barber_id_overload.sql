-- =========================================================================
-- Migration: Remove Function Overloads com p_barber_id
-- =========================================================================
-- Remove as sobrecargas indesejadas de criar_agendamento e
-- criar_agendamento_rate_limited que aceitam p_barber_id como
-- parâmetro extra. Ambas são resquícios da feature multi-barbeiro
-- que foi revertida. A aplicação nunca envia p_barber_id, causando
-- erro de ambiguidade no PostgreSQL.
-- =========================================================================

-- Remove sobrecarga de criar_agendamento com p_barber_id
DROP FUNCTION IF EXISTS criar_agendamento(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time without time zone,
    p_preco_total numeric,
    p_duracao_total integer,
    p_cliente_email text,
    p_barber_id uuid
);

-- Remove sobrecarga de criar_agendamento_rate_limited com p_barber_id
DROP FUNCTION IF EXISTS criar_agendamento_rate_limited(
    p_cliente_nome text,
    p_cliente_telefone text,
    p_servicos uuid[],
    p_data date,
    p_hora time without time zone,
    p_preco_total numeric,
    p_duracao_total integer,
    p_cliente_email text,
    p_barber_id uuid
);

-- Verificação: ambas as funções devem ter exatamente 1 overload cada
DO $$
DECLARE
    v_count_agendamento integer;
    v_count_limited integer;
BEGIN
    SELECT COUNT(*) INTO v_count_agendamento
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'criar_agendamento';

    SELECT COUNT(*) INTO v_count_limited
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'criar_agendamento_rate_limited';

    IF v_count_agendamento != 1 THEN
        RAISE EXCEPTION 'Esperava 1 overload de criar_agendamento, mas encontrei %', v_count_agendamento;
    END IF;

    IF v_count_limited != 1 THEN
        RAISE EXCEPTION 'Esperava 1 overload de criar_agendamento_rate_limited, mas encontrei %', v_count_limited;
    END IF;

    RAISE NOTICE 'OK: ambas as funções têm exatamente 1 overload (sem p_barber_id)';
END $$;
