import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';

type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'booking_created'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'thank_you_sent';

interface AuditLogEntry {
  action: AuditAction;
  details?: Record<string, unknown>;
  target_id?: string;
}

/**
 * Hook de auditoria simplificado — loga APENAS login e booking.
 * Ações secundárias (client_created, slot_blocked, etc.) foram removidas
 * porque o banco de dados `audit_logs` cresce rápido e ninguém consulta.
 */
export function useAuditLog() {
  const log = useCallback(async ({ action, details, target_id }: AuditLogEntry) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user_id = session?.user?.id;

      await supabase.from('audit_logs').insert({
        action,
        user_id,
        target_id,
        details,
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch (e) {
      logError(e);
    }
  }, []);

  const logLogin = useCallback(
    (success: boolean, email?: string) => {
      log({
        action: success ? 'login_success' : 'login_failed',
        details: { email },
      });
    },
    [log]
  );

  const logBooking = useCallback(
    (
      action:
        | 'booking_created'
        | 'booking_completed'
        | 'booking_cancelled'
        | 'booking_rescheduled'
        | 'thank_you_sent',
      bookingId: string,
      details?: Record<string, unknown>
    ) => {
      log({ action, target_id: bookingId, details });
    },
    [log]
  );

  return {
    log,
    logLogin,
    logBooking,
  };
}
