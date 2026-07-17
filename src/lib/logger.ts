/**
 * Centralized error logging. In development, logs to console.warn.
 * In production, errors are silently captured (Sentry integration
 * happens at the ErrorBoundary / global handler level).
 *
 * Usage:  catch (e) { logError(e, 'useBookingSlots'); }
 */
export function logError(error: unknown, context?: string) {
  if (import.meta.env.DEV) {
    const msg = error instanceof Error ? error.message : String(error);
    const prefix = context ? `[${context}]` : '';
    console.warn(`${prefix} Error:`, msg, error);
  }
}
