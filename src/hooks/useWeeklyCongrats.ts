/**
 * useWeeklyCongrats foi removido.
 *
 * Motivo: Funcionalidade duplicada com o CRON server-side send_weekly_report().
 * O backend já envia relatório semanal automático via Supabase CRON (segunda 8h BRT)
 * com métricas mais completas (faturamento, atendimentos, cancelamentos, serviço
 * mais pedido, novos clientes).
 *
 * O hook client-side era não confiável por depender do relógio do navegador e
 * só funcionar enquanto a página admin estivesse aberta.
 *
 * Migration: 20260717_remove_weekly_congrats
 * Substituído por: send_weekly_report() no universal.sql (CRON schedule 'weekly-report')
 */
export {};
