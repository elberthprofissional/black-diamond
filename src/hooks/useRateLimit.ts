import { useState, useCallback } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60000, // 1 minuto
};

export function useRateLimit(key: string, config: Partial<RateLimitConfig> = {}) {
  const { maxAttempts, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const [attempts, setAttempts] = useState<number>(() => {
    const stored = localStorage.getItem(`ratelimit_${key}`);
    if (!stored) return 0;
    const { count, timestamp } = JSON.parse(stored);
    if (Date.now() - timestamp > windowMs) {
      localStorage.removeItem(`ratelimit_${key}`);
      return 0;
    }
    return count;
  });

  const isBlocked = attempts >= maxAttempts;

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    const stored = localStorage.getItem(`ratelimit_${key}`);

    if (stored) {
      const { count, timestamp } = JSON.parse(stored);
      if (now - timestamp > windowMs) {
        localStorage.setItem(`ratelimit_${key}`, JSON.stringify({ count: 1, timestamp: now }));
        setAttempts(1);
        return true;
      }
      if (count >= maxAttempts) {
        setAttempts(count);
        return false;
      }
      const newCount = count + 1;
      localStorage.setItem(`ratelimit_${key}`, JSON.stringify({ count: newCount, timestamp }));
      setAttempts(newCount);
      return true;
    }

    localStorage.setItem(`ratelimit_${key}`, JSON.stringify({ count: 1, timestamp: now }));
    setAttempts(1);
    return true;
  }, [key, maxAttempts, windowMs]);

  const reset = useCallback(() => {
    localStorage.removeItem(`ratelimit_${key}`);
    setAttempts(0);
  }, [key]);

  const getTimeUntilReset = useCallback(() => {
    const stored = localStorage.getItem(`ratelimit_${key}`);
    if (!stored) return 0;
    const { timestamp } = JSON.parse(stored);
    const remaining = windowMs - (Date.now() - timestamp);
    return remaining > 0 ? remaining : 0;
  }, [key, windowMs]);

  return {
    isBlocked,
    attempts,
    maxAttempts,
    recordAttempt,
    reset,
    getTimeUntilReset,
  };
}
