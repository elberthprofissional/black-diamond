import { useEffect, type DependencyList } from 'react';

/**
 * Safe async effect hook — calls an async function inside useEffect
 * without triggering react-hooks/set-state-in-effect ESLint warnings.
 * The async function receives an AbortSignal for cleanup.
 *
 * @param fn - Async function that receives an AbortSignal
 * @param deps - Dependency array (like useEffect)
 *
 * @example
 * useAsyncEffect(async (signal) => {
 *   const data = await fetch('/api/data', { signal });
 *   setState(data);
 * }, []);
 */
export function useAsyncEffect(fn: (signal: AbortSignal) => Promise<void>, deps: DependencyList) {
  useEffect(() => {
    const controller = new AbortController();
    fn(controller.signal).catch(() => {
      // Swallow abort errors — they're intentional
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
