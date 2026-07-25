import { useState, useCallback } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60000,
};

/**
 * Hook de rate limit simplificado — apenas in-memory.
 * O rate limit server-side via RPC do Supabase já protege contra abusos;
 * este hook serve apenas para feedback visual em tempo real.
 */
export function useRateLimit(_key: string, config: Partial<RateLimitConfig> = {}) {
  const { maxAttempts, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  // eslint-disable-next-line react-hooks/purity
  const isBlocked = blockedUntil !== null && Date.now() < blockedUntil;

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    if (blockedUntil && now < blockedUntil) return false;

    setAttempts((prev) => {
      const next = prev + 1;
      if (next >= maxAttempts) {
        setBlockedUntil(now + windowMs);
      }
      return next;
    });
    return true;
  }, [blockedUntil, maxAttempts, windowMs]);

  const reset = useCallback(() => {
    setAttempts(0);
    setBlockedUntil(null);
  }, []);

  const getTimeUntilReset = useCallback(() => {
    if (!blockedUntil) return 0;
    const remaining = blockedUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }, [blockedUntil]);

  return {
    isBlocked,
    attempts,
    maxAttempts,
    recordAttempt,
    reset,
    getTimeUntilReset,
  };
}
