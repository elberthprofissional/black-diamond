-- =========================================================================
-- BLACK DIAMOND - CRON JOBS E AUTOMAÇÕES (Consolidado)
-- =========================================================================
-- Jobs agendados para manutenção automática do sistema.
-- =========================================================================

-- =========================================================================
-- JOBS EXISTENTES: remover antes de recriar
-- =========================================================================

DO $$
BEGIN
    -- Auto-block lunch break
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-block-lunch') THEN
        PERFORM cron.unschedule('auto-block-lunch');
    END IF;

    -- Cleanup tokens
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-tokens') THEN
        PERFORM cron.unschedule('cleanup-tokens');
    END IF;

    -- Cleanup rate limits
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits') THEN
        PERFORM cron.unschedule('cleanup-rate-limits');
    END IF;

    -- Completar agendamentos expirados
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'completar-agendamentos') THEN
        PERFORM cron.unschedule('completar-agendamentos');
    END IF;

    -- Verificar mensalistas
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verificar-mensalistas') THEN
        PERFORM cron.unschedule('verificar-mensalistas');
    END IF;

    -- Limpar notificações antigas
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clean-notifications') THEN
        PERFORM cron.unschedule('clean-notifications');
    END IF;

    -- Limpeza mensal
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-cleanup') THEN
        PERFORM cron.unschedule('monthly-cleanup');
    END IF;

    -- Relatório semanal
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-report') THEN
        PERFORM cron.unschedule('weekly-report');
    END IF;
END $$;

-- =========================================================================
-- JOBS: criar
-- =========================================================================

-- Auto-block lunch break: todos os dias às 00:00 BRT (03:00 UTC)
SELECT cron.schedule(
    'auto-block-lunch',
    '0 3 * * *',
    $$ SELECT auto_block_lunch_break() $$
);

-- Cleanup tokens expirados: todos os dias às 04:00 BRT (07:00 UTC)
SELECT cron.schedule(
    'cleanup-tokens',
    '0 7 * * *',
    $$ SELECT cleanup_expired_tokens() $$
);

-- Cleanup rate limits: a cada hora
SELECT cron.schedule(
    'cleanup-rate-limits',
    '15 * * * *',
    $$ SELECT cleanup_rate_limits() $$
);

-- Completar agendamentos expirados: a cada 15 minutos
SELECT cron.schedule(
    'completar-agendamentos',
    '*/15 * * * *',
    $$ SELECT completar_agendamentos_expirados() $$
);

-- Verificar mensalistas: todos os dias às 08:00 BRT (11:00 UTC)
SELECT cron.schedule(
    'verificar-mensalistas',
    '0 11 * * *',
    $$ SELECT verificar_mensalistas() $$
);

-- Limpar notificações antigas: todos os dias às 03:00 BRT (06:00 UTC)
SELECT cron.schedule(
    'clean-notifications',
    '0 6 * * *',
    $$ SELECT clean_old_notifications() $$
);

-- Limpeza mensal de dados: dia 1 de cada mês às 02:00 BRT (05:00 UTC)
SELECT cron.schedule(
    'monthly-cleanup',
    '0 5 1 * *',
    $$ SELECT cleanup_old_data() $$
);

-- Relatório semanal: domingo às 20:00 BRT (23:00 UTC)
SELECT cron.schedule(
    'weekly-report',
    '0 23 * * 0',
    $$ SELECT send_weekly_report() $$
);
