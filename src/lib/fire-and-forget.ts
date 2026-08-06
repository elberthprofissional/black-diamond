import { logError } from './logger';

/**
 * Options for fire-and-forget promise execution.
 */
export interface FireForgetOptions {
  /** Context name for error logging (e.g., 'createNotification') */
  context?: string;
  /** Optional callback when the promise fails */
  onError?: (err: unknown) => void;
  /** Optional callback when the promise succeeds */
  onSuccess?: () => void;
}

/**
 * Executes a promise in fire-and-forget fashion with proper error handling.
 *
 * Use this for non-critical operations where you don't need to await
 * the result (e.g., creating notifications, logging, cache updates).
 *
 * Unlike raw `.catch(() => {})`, this:
 *  - Logs the error with context via logError (dev + prod)
 *  - Supports optional onError/onSuccess callbacks
 *  - Returns void so it's clear the promise is not being awaited
 *
 * @param promise - The promise to execute
 * @param options - Configuration options
 *
 * @example
 * fireAndForget(
 *   supabase.from('notifications').insert({...}),
 *   { context: 'createNotification' }
 * );
 *
 * @example
 * fireAndForget(
 *   supabase.removeChannel(channel),
 *   {
 *     context: 'cleanupChannel',
 *     onError: () => showToast('Falha ao limpar canal', 'warning'),
 *   }
 * );
 */
export function fireAndForget<T>(promise: Promise<T>, options?: FireForgetOptions): void {
  promise
    .then(() => {
      options?.onSuccess?.();
    })
    .catch((err: unknown) => {
      logError(err, options?.context || 'fireAndForget');
      options?.onError?.(err);
    });
}
