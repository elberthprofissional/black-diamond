-- =========================================================================
-- CRON LEMBRETE PRO BARBEIRO
-- Roda no SQL Editor do Supabase.
-- Antes de rodar, configure as variáveis abaixo com seus valores reais.
-- =========================================================================

-- 1. Configurar as variáveis de app (substitua os valores)
ALTER DATABASE SET "app.settings.supabase_url" = 'SUA_URL_SUPABASE';
ALTER DATABASE SET "app.settings.service_role_key" = 'SUA_SERVICE_ROLE_KEY';

-- 2. Garantir que a extensão http existe
CREATE EXTENSION IF NOT EXISTS http;

-- 3. Remover crons antigos se existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lembrete-barbeiro-terca') THEN
        PERFORM cron.unschedule('lembrete-barbeiro-terca');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lembrete-barbeiro-quarta') THEN
        PERFORM cron.unschedule('lembrete-barbeiro-quarta');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lembrete-barbeiro-quinta') THEN
        PERFORM cron.unschedule('lembrete-barbeiro-quinta');
    END IF;
END $$;

-- 4. Criar os crons: terça, quarta e quinta às 8:00 BRT (11:00 UTC)
SELECT cron.schedule(
    'lembrete-barbeiro-terca',
    '0 11 * * 2',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-barber-reminder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

SELECT cron.schedule(
    'lembrete-barbeiro-quarta',
    '0 11 * * 3',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-barber-reminder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

SELECT cron.schedule(
    'lembrete-barbeiro-quinta',
    '0 11 * * 4',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-barber-reminder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);
