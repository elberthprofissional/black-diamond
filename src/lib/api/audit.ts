/**
 * Módulo de auditoria — DESATIVADO.
 *
 * Histórico: audit_logs crescia rápido e ninguém consultava.
 * As ações críticas (login, booking) já são registradas em suas próprias tabelas.
 * Para reativar, basta remover os early-return abaixo.
 */

export type AuditAction =
  | 'client_created'
  | 'booking_created'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'booking_no_show'
  | 'booking_no_show_undone'
  | 'login_success'
  | 'login_failed'
  | 'thank_you_sent';

interface AuditLogEntry {
  action: AuditAction;
  details?: Record<string, unknown>;
  target_id?: string;
}

/**
 * Insere um log de auditoria — atualmente desativado.
 * A função existe para não quebrar consumidores, mas não escreve no banco.
 */
export async function insertAuditLog(_entry: AuditLogEntry): Promise<void> {
  // Auditoria desativada — não escreve no banco.
  // Se precisar reativar, implemente a lógica de supabase.from('audit_logs').insert({...})
  return;
}
