import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimit } from './useRateLimit';

describe('useRateLimit', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicia com 0 tentativas', () => {
    const { result } = renderHook(() => useRateLimit('test'));
    expect(result.current.attempts).toBe(0);
    expect(result.current.isBlocked).toBe(false);
  });

  it('registra tentativas corretamente', () => {
    const { result } = renderHook(() => useRateLimit('test', { maxAttempts: 3 }));

    act(() => {
      result.current.recordAttempt();
    });
    expect(result.current.attempts).toBe(1);

    act(() => {
      result.current.recordAttempt();
    });
    expect(result.current.attempts).toBe(2);
  });

  it('bloqueia após atingir limite', () => {
    const { result } = renderHook(() => useRateLimit('test', { maxAttempts: 2 }));

    act(() => {
      result.current.recordAttempt();
    });
    act(() => {
      result.current.recordAttempt();
    });

    expect(result.current.isBlocked).toBe(true);
    expect(result.current.recordAttempt()).toBe(false);
  });

  it('reset limpa tentativas', () => {
    const { result } = renderHook(() => useRateLimit('test', { maxAttempts: 3 }));

    act(() => {
      result.current.recordAttempt();
    });
    act(() => {
      result.current.recordAttempt();
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.attempts).toBe(0);
    expect(result.current.isBlocked).toBe(false);
  });

  it('usa storage separado por key', () => {
    const { result: r1 } = renderHook(() => useRateLimit('key1', { maxAttempts: 2 }));
    const { result: r2 } = renderHook(() => useRateLimit('key2', { maxAttempts: 2 }));

    act(() => {
      r1.current.recordAttempt();
    });
    act(() => {
      r1.current.recordAttempt();
    });

    expect(r1.current.isBlocked).toBe(true);
    expect(r2.current.isBlocked).toBe(false);
  });

  it('expira após windowMs e reseta automaticamente', () => {
    const { result } = renderHook(() =>
      useRateLimit('expiry-test', { maxAttempts: 2, windowMs: 5000 })
    );

    act(() => {
      result.current.recordAttempt();
    });
    act(() => {
      result.current.recordAttempt();
    });
    expect(result.current.isBlocked).toBe(true);

    // Avançar tempo além da janela
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Re-render after expiry
    const { result: result2 } = renderHook(() =>
      useRateLimit('expiry-test', { maxAttempts: 2, windowMs: 5000 })
    );
    expect(result2.current.isBlocked).toBe(false);
    expect(result2.current.attempts).toBe(0);
  });

  it('getTimeUntilReset retorna tempo restante correto', () => {
    const { result } = renderHook(() =>
      useRateLimit('time-test', { maxAttempts: 5, windowMs: 10000 })
    );

    act(() => {
      result.current.recordAttempt();
    });

    const remaining = result.current.getTimeUntilReset();
    expect(remaining).toBeGreaterThan(9000);
    expect(remaining).toBeLessThanOrEqual(10000);
  });

  it('persiste no localStorage', () => {
    const { result } = renderHook(() => useRateLimit('persist-test', { maxAttempts: 3 }));

    act(() => {
      result.current.recordAttempt();
    });

    const stored = localStorage.getItem('ratelimit_persist-test');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.count).toBe(1);
  });

  it('lida com localStorage corrompido', () => {
    localStorage.setItem('ratelimit_corrupt', 'not-json');

    const { result } = renderHook(() => useRateLimit('corrupt', { maxAttempts: 3 }));

    expect(result.current.attempts).toBe(0);
    expect(result.current.isBlocked).toBe(false);
  });
});
