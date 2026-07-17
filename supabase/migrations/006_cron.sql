-- =========================================================================
-- BLACK DIAMOND - CRON JOBS CONSOLIDADO
-- =========================================================================
-- Jobs agendados para manutencao automatica do sistema.
-- =========================================================================

-- Remover jobs existentes antes de recriar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-block-lunch') THEN PERFORM cron.unschedule('auto-block-lunch'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-tokens') THEN PERFORM cron.unschedule('cleanup-tokens'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits') THEN PERFORM cron.unschedule('cleanup-rate-limits'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'completar-agendamentos') THEN PERFORM cron.unschedule('completar-agendamentos'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verificar-mensalistas') THEN PERFORM cron.unschedule('verificar-mensalistas'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clean-notifications') THEN PERFORM cron.unschedule('clean-notifications'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-cleanup') THEN PERFORM cron.unschedule('monthly-cleanup'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-report') THEN PERFORM cron.unschedule('weekly-report'); END IF;
END $$;

-- Criar jobs
SELECT cron.schedule('auto-block-lunch', '0 3 * * *', $$ SELECT auto_block_lunch_break() $$);
SELECT cron.schedule('cleanup-tokens', '0 7 * * *', $$ SELECT cleanup_expired_tokens() $$);
SELECT cron.schedule('cleanup-rate-limits', '15 * * * *', $$ SELECT cleanup_rate_limits() $$);
SELECT cron.schedule('completar-agendamentos', '*/15 * * * *', $$ SELECT completar_agendamentos_expirados() $$);
SELECT cron.schedule('verificar-mensalistas', '0 11 * * *', $$ SELECT verificar_mensalistas() $$);
SELECT cron.schedule('clean-notifications', '0 6 * * *', $$ SELECT clean_old_notifications() $$);
SELECT cron.schedule('monthly-cleanup', '0 5 1 * *', $$ SELECT cleanup_old_data() $$);
SELECT cron.schedule('weekly-report', '0 23 * * 0', $$ SELECT send_weekly_report() $$);
