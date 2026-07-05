import { useRef } from 'react';

/**
 * Returns a ref that always holds the latest value.
 * Useful when you need to access the most recent value
 * inside callbacks or effects without re-triggering them.
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
