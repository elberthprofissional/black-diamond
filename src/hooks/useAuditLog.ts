import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'booking_created'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'thank_you_sent'
  | 'client_created'
  | 'client_updated'
  | 'client_deleted'
  | 'service_created'
  | 'service_updated'
  | 'service_deleted'
  | 'slot_blocked'
  | 'slot_unblocked'
  | 'settings_updated'
  | 'password_changed';

interface AuditLogEntry {
  action: AuditAction;
  details?: Record<string, unknown>;
  target_id?: string;
}

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
        ip_address: null, // Será preenchido pelo RLS ou edge function se necessário
        user_agent: navigator.userAgent,
      });
    } catch {
      // Audit log failed silently — do not block user action
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
