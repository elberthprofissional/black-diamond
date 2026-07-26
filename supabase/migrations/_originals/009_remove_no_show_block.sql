-- =========================================================================
-- BLACK DIAMOND - REMOVE BLOQUEIO AUTOMATICO DE CLIENTES
-- =========================================================================
-- Ao inves de BLOQUEAR o cliente quando atinge o limite de faltas,
-- o sistema apenas NOTIFICA o barbeiro com um atalho pra chamar o
-- cliente no WhatsApp. O barbeiro decide se quer conversar ou nao.
-- Cliente bloqueado = cliente perdido. Melhor recuperar do que punir.
-- =========================================================================

-- Remove o bloqueio na funcao de criacao de agendamento
CREATE OR REPLACE FUNCTION check_client_no_show_block(p_client_id uuid)
RETURNS void AS $$
BEGIN
    -- Nao bloqueia mais o cliente automaticamente.
    -- Apenas notifica o barbeiro via checkAndNotifyNoShowLimit (frontend).
    -- O barbeiro decide se quer conversar com o cliente no WhatsApp.
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Remove a funcao de verificacao de bloqueio (nao usada em mais nada)
CREATE OR REPLACE FUNCTION is_client_blocked_by_no_show(p_client_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Sempre retorna false — nao bloqueamos mais clientes por falta
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
