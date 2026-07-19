-- =========================================================================
-- BLACK DIAMOND - CRON JOBS
-- =========================================================================
-- Jobs agendados para manutencao automatica do sistema.
-- 6 jobs consolidados (eram 8).
-- =========================================================================

-- Remover jobs existentes antes de recriar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-block-lunch') THEN PERFORM cron.unschedule('auto-block-lunch'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'completar-agendamentos') THEN PERFORM cron.unschedule('completar-agendamentos'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verificar-mensalistas') THEN PERFORM cron.unschedule('verificar-mensalistas'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-cleanup') THEN PERFORM cron.unschedule('monthly-cleanup'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-report') THEN PERFORM cron.unschedule('weekly-report'); END IF;
    -- Jobs antigos consolidados
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-tokens') THEN PERFORM cron.unschedule('cleanup-tokens'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits') THEN PERFORM cron.unschedule('cleanup-rate-limits'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clean-notifications') THEN PERFORM cron.unschedule('clean-notifications'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-all') THEN PERFORM cron.unschedule('cleanup-all'); END IF;
END $$;

-- 1. Completar agendamentos expirados (a cada 15 min)
SELECT cron.schedule('completar-agendamentos', '*/15 * * * *', $$ SELECT completar_agendamentos_expirados() $$);

-- 2. Cleanup diario: tokens + notificacoes + rate limits (6h da manha)
SELECT cron.schedule('cleanup-all', '0 6 * * *', $$
    DELETE FROM booking_tokens WHERE expires_at < NOW();
    DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
$$);

-- 3. Bloquear horarios de almoco (3h da manha)
SELECT cron.schedule('auto-block-lunch', '0 3 * * *', $$ SELECT auto_block_lunch_break() $$);

-- 4. Verificar mensalistas proximos do vencimento (11h da manha)
SELECT cron.schedule('verificar-mensalistas', '0 11 * * *', $$ SELECT verificar_mensalistas() $$);

-- 5. Limpeza mensal de dados antigos (dia 1, 5h da manha)
SELECT cron.schedule('monthly-cleanup', '0 5 1 * *', $$ SELECT cleanup_old_data() $$);

-- 6. Relatorio semanal (domingo, 23h)
SELECT cron.schedule('weekly-report', '0 23 * * 0', $$ SELECT send_weekly_report() $$);
