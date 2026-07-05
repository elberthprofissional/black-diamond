import { useState, useCallback } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60000,
};

function safeParse(stored: string): { count: number; timestamp: number } | null {
  try {
    const parsed = JSON.parse(stored);
    if (typeof parsed.count === 'number' && typeof parsed.timestamp === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function useRateLimit(key: string, config: Partial<RateLimitConfig> = {}) {
  const { maxAttempts, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const [attempts, setAttempts] = useState<number>(() => {
    const stored = localStorage.getItem(`ratelimit_${key}`);
    if (!stored) return 0;
    const parsed = safeParse(stored);
    if (!parsed) {
      localStorage.removeItem(`ratelimit_${key}`);
      return 0;
    }
    if (Date.now() - parsed.timestamp > windowMs) {
      localStorage.removeItem(`ratelimit_${key}`);
      return 0;
    }
    return parsed.count;
  });

  const isBlocked = attempts >= maxAttempts;

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    const stored = localStorage.getItem(`ratelimit_${key}`);

    if (stored) {
      const parsed = safeParse(stored);
      if (!parsed) {
        localStorage.setItem(`ratelimit_${key}`, JSON.stringify({ count: 1, timestamp: now }));
        setAttempts(1);
        return true;
      }
      if (now - parsed.timestamp > windowMs) {
        localStorage.setItem(`ratelimit_${key}`, JSON.stringify({ count: 1, timestamp: now }));
        setAttempts(1);
        return true;
      }
      if (parsed.count >= maxAttempts) {
        setAttempts(parsed.count);
        return false;
      }
      const newCount = parsed.count + 1;
      localStorage.setItem(
        `ratelimit_${key}`,
        JSON.stringify({ count: newCount, timestamp: parsed.timestamp })
      );
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
    const parsed = safeParse(stored);
    if (!parsed) return 0;
    const remaining = windowMs - (Date.now() - parsed.timestamp);
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
