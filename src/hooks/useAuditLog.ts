import { useCallback } from 'react';
import { insertAuditLog, type AuditAction } from '../lib/api/audit';

interface AuditLogEntry {
  action: AuditAction;
  details?: Record<string, unknown>;
  target_id?: string;
}

export function useAuditLog() {
  const log = useCallback(async (entry: AuditLogEntry) => {
    await insertAuditLog(entry);
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
