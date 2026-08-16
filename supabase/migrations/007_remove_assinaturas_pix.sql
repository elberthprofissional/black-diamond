-- =========================================================================
-- BLACK DIAMOND - 007 - REMOÇÃO DO SISTEMA DE ASSINATURAS/PIX
-- =========================================================================
-- O sistema de assinaturas mensais com pagamento PIX (Asaas) foi removido
-- (2026-08-15). Esta migration dropa tabelas, funções, trigger e cron
-- relacionados. Dados antigos: scripts/backup-assinaturas-pix.json.
-- =========================================================================

-- Cron: limpar assinaturas antigas (job #9)
SELECT cron.unschedule(9) WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobid = 9);

-- Trigger que criava assinatura automática ao inserir barbeiro
DROP TRIGGER IF EXISTS trg_auto_create_subscription ON public.barbers;

-- Tabelas
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.payment_logs CASCADE;
DROP TABLE IF EXISTS public.payment_blocked_users CASCADE;

-- Funções
DROP FUNCTION IF EXISTS public.auto_create_subscription;
DROP FUNCTION IF EXISTS public.check_login_allowed;
DROP FUNCTION IF EXISTS public.check_subscription_status;
DROP FUNCTION IF EXISTS public.get_payment_history;
DROP FUNCTION IF EXISTS public.update_subscription_paid;
DROP FUNCTION IF EXISTS public.limpar_subscriptions_antigas;

-- Setting da chave PIX do proprietário (só era usada pelas assinaturas)
DELETE FROM public.settings WHERE key = 'owner_pix_key';
