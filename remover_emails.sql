-- =========================================================================
-- REMOVER SISTEMA DE EMAILS - Black Diamond
-- Colar no Supabase SQL Editor e clicar RUN
-- =========================================================================

-- Remove o trigger que envia email de confirmação ao agendar
DROP TRIGGER IF EXISTS trigger_enviar_email_confirmacao ON bookings;

-- Remove a função de confirmação por email
DROP FUNCTION IF EXISTS enviar_email_confirmacao_imediata();

-- Remove o cron job de lembrete 30 minutos antes
SELECT cron.unschedule('enviar-lembretes-30minutos');

-- Remove a função de lembrete
DROP FUNCTION IF EXISTS enviar_lembretes_30_minutos();

-- Remove o trigger de email de avaliação
DROP TRIGGER IF EXISTS trigger_enviar_email_avaliacao ON bookings;

-- Remove a função de email de avaliação
DROP FUNCTION IF EXISTS enviar_email_avaliacao();

-- =========================================================================
-- PRONTO! Todos os emails removidos.
-- Push notification continua funcionando normalmente.
-- =========================================================================
