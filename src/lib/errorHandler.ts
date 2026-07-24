import { logError } from './logger';

type ShowToastFn = (message: string) => void;

/**
 * Wraps an async operation with consistent error handling.
 * Logs the error via logError and optionally shows a user-facing toast.
 *
 * @param fn - The async operation to execute
 * @param options.userMessage - Message to show via showError toast on failure
 * @param options.context - Context string for logError (e.g. hook name)
 * @param options.showError - Toast function to display error to user
 * @returns The result of fn, or undefined if it threw
 */
export async function handleAsyncError<T>(
  fn: () => Promise<T>,
  options: {
    userMessage?: string;
    context?: string;
    showError?: ShowToastFn;
  } = {}
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    logError(e, options.context);
    if (options.userMessage && options.showError) {
      options.showError(options.userMessage);
    }
    return undefined;
  }
}
