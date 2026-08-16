/**
 * Centralized error logging. In development, logs to console.warn.
 * In production, saves to a localStorage ring buffer (last 20 errors)
 * as a fallback for Sentry. Also logs to console.error in production
 * for critical errors.
 *
 * Usage:
 *   catch (e) { logError(e, 'useBookingSlots'); }
 *   logError(e, 'useBookingSlots', { bookingId: 'xxx' });
 */

const ERROR_LOG_KEY = 'bd_error_log';
const MAX_ERRORS = 20;

interface ErrorLogEntry {
  msg: string;
  context?: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

function saveToLocalStorage(entry: ErrorLogEntry) {
  try {
    const stored = localStorage.getItem(ERROR_LOG_KEY);
    const errors: ErrorLogEntry[] = stored ? JSON.parse(stored) : [];
    errors.push(entry);
    // Mantém apenas os últimos MAX_ERRORS erros
    const trimmed = errors.slice(-MAX_ERRORS);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage indisponível — ignora fallback
  }
}

export function logError(error: unknown, context?: string, extra?: Record<string, unknown>) {
  const msg = error instanceof Error ? error.message : String(error);
  const prefix = context ? `[${context}]` : '';

  if (import.meta.env.DEV) {
    console.warn(`${prefix} Error:`, msg, error);
    return;
  }

  // Produção: loga no console.error + fallback localStorage
  console.error(`${prefix} Error:`, msg, error);

  const entry: ErrorLogEntry = {
    msg,
    context,
    timestamp: new Date().toISOString(),
    extra,
  };

  saveToLocalStorage(entry);
}
