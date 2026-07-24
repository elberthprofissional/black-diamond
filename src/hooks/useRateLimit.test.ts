import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimit } from './useRateLimit';

describe('useRateLimit', () => {
  beforeEach(() => {
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

  it('bloqueio expira após windowMs', () => {
    const { result, rerender } = renderHook(() =>
      useRateLimit('expiry-test', { maxAttempts: 2, windowMs: 5000 })
    );

    act(() => {
      result.current.recordAttempt();
    });
    act(() => {
      result.current.recordAttempt();
    });
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.recordAttempt()).toBe(false);

    // Avançar tempo além da janela
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Re-render para recalcular isBlocked com o novo Date.now()
    rerender();

    expect(result.current.isBlocked).toBe(false);
    expect(result.current.recordAttempt()).toBe(true);
  });

  it('getTimeUntilReset retorna tempo restante correto', () => {
    const { result } = renderHook(() =>
      useRateLimit('time-test', { maxAttempts: 2, windowMs: 10000 })
    );

    // Ainda não bloqueou → 0
    expect(result.current.getTimeUntilReset()).toBe(0);

    act(() => {
      result.current.recordAttempt();
    });
    act(() => {
      result.current.recordAttempt();
    });

    const remaining = result.current.getTimeUntilReset();
    expect(remaining).toBeGreaterThan(9000);
    expect(remaining).toBeLessThanOrEqual(10000);
  });

  it('retorna false no recordAttempt se bloqueado', () => {
    const { result } = renderHook(() =>
      useRateLimit('retry-test', { maxAttempts: 1, windowMs: 10000 })
    );

    act(() => {
      const allowed = result.current.recordAttempt();
      expect(allowed).toBe(true);
    });

    act(() => {
      const allowed = result.current.recordAttempt();
      expect(allowed).toBe(false);
    });
  });
});
