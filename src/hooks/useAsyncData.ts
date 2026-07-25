import { useState, useCallback, useRef, useEffect } from 'react';
import { logError } from '../lib/logger';

interface UseAsyncDataOptions<T> {
  /** Called on mount to fetch initial data */
  fetchFn: () => Promise<T>;
  /** Called when fetch succeeds */
  onSuccess?: (data: T) => void;
  /** Called when fetch fails */
  onError?: (error: Error) => void;
  /** Auto-refetch interval in ms (0 = no interval) */
  refreshInterval?: number;
  /** Cache key for localStorage persistence */
  cacheKey?: string;
  /** Cache TTL in ms (default: 24h) */
  cacheTTL?: number;
  /** Skip initial fetch (e.g. if data is provided externally) */
  skip?: boolean;
}

interface UseAsyncDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setData: (data: T) => void;
}

function loadCache<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - parsed.ts > ttl) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function saveCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Storage full — ignore
  }
}

/**
 * Generic hook for async data fetching with:
 * - AbortController-based cleanup
 * - Optional localStorage cache
 * - Optional auto-refresh interval
 * - Loading/error state management
 *
 * @example
 * const { data, loading, refetch } = useAsyncData({
 *   fetchFn: () => getServices(),
 *   cacheKey: 'services',
 *   refreshInterval: 5 * 60 * 1000,
 * });
 */
export function useAsyncData<T>({
  fetchFn,
  onSuccess,
  onError,
  refreshInterval = 0,
  cacheKey,
  cacheTTL = 24 * 60 * 60 * 1000,
  skip = false,
}: UseAsyncDataOptions<T>): UseAsyncDataReturn<T> {
  const [data, setData] = useState<T | null>(() => {
    if (cacheKey) return loadCache<T>(cacheKey, cacheTTL);
    return null;
  });
  const [loading, setLoading] = useState(!data && !skip);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (skip) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      if (controller.signal.aborted || !mountedRef.current) return;
      setData(result);
      if (cacheKey) saveCache(cacheKey, result);
      onSuccess?.(result);
    } catch (err) {
      if (controller.signal.aborted || !mountedRef.current) return;
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchFn, onSuccess, onError, cacheKey, skip]);

  // Fetch on mount
  useEffect(() => {
    if (!skip) refetch();
  }, [refetch, skip]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || skip) return;
    const interval = setInterval(refetch, refreshInterval);
    return () => clearInterval(interval);
  }, [refetch, refreshInterval, skip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { data, loading, error, refetch, setData };
}
