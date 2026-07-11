-- =========================================================================
-- Migration: Controle de Faltas (No-Show)
-- =========================================================================
-- 1. Adiciona coluna no_show na tabela bookings
-- 2. Adiciona configuração max_no_shows na tabela settings
-- 3. Função para verificar se cliente está bloqueado por faltas
-- =========================================================================

-- 1. Coluna no_show na tabela bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT FALSE;

-- Índice para consultas rápidas de no_show por cliente
CREATE INDEX IF NOT EXISTS idx_bookings_no_show_client
ON bookings (client_id, no_show, booking_date DESC)
WHERE no_show = TRUE;

-- 2. Configuração padrão: 3 faltas = bloqueio automático
INSERT INTO settings (key, value) VALUES ('max_no_shows', '3')
ON CONFLICT (key) DO NOTHING;

-- 3. Função: verificar se cliente excedeu limite de faltas
CREATE OR REPLACE FUNCTION is_client_blocked_by_no_show(p_client_id uuid)
RETURNS boolean AS $$
DECLARE
    v_max_no_shows integer;
    v_no_show_count integer;
BEGIN
    -- Pega o limite configurado (padrão 3)
    SELECT COALESCE(
        (SELECT value::integer FROM settings WHERE key = 'max_no_shows'),
        3
    ) INTO v_max_no_shows;

    -- Conta faltas nos últimos 90 dias
    SELECT COUNT(*) INTO v_no_show_count
    FROM bookings
    WHERE client_id = p_client_id
    AND no_show = TRUE
    AND booking_date >= (CURRENT_DATE - 90);

    RETURN v_no_show_count >= v_max_no_shows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atualiza criar_agendamento para bloquear clientes com excesso de faltas
-- A função é recriada inteira para adicionar a verificação.
-- A definição completa está no universal.sql, aqui só o bloco adicional.

-- Como a função criar_agendamento é grande, vamos usar DO $$ para verificar
-- se a validação já existe. Se não, criamos uma função separada que pode
-- ser chamada antes de criar o agendamento.

CREATE OR REPLACE FUNCTION check_client_no_show_block(p_client_id uuid)
RETURNS void AS $$
BEGIN
    IF is_client_blocked_by_no_show(p_client_id) THEN
        RAISE EXCEPTION 'Cliente bloqueado por excesso de faltas. Entre em contato para mais informações.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
