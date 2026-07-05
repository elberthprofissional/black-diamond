import { useCallback, useRef } from 'react';

/**
 * Returns a stable callback that always calls the latest version of the callback.
 * Useful when you need to pass a callback to effects or memoized values
 * without including it in the dependency array.
 */
export function useCallbackRef<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    (...args: unknown[]) => callbackRef.current(...args),
    []
  ) as T;
}
