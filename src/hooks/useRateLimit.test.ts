import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimit } from './useRateLimit';

describe('useRateLimit', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
