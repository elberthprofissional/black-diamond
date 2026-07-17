import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookingFilters } from './useBookingFilters';

beforeEach(() => {
  vi.spyOn(window, 'addEventListener');
  vi.spyOn(window, 'removeEventListener');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBookingFilters', () => {
  it('inicializa com filter occupied', () => {
    const { result } = renderHook(() => useBookingFilters());
    expect(result.current.filter).toBe('occupied');
  });

  it('detecta desktop (>= 1024px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });
    const { result } = renderHook(() => useBookingFilters());
    expect(result.current.isDesktop).toBe(true);
  });

  it('detecta mobile (< 1024px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    const { result } = renderHook(() => useBookingFilters());
    expect(result.current.isDesktop).toBe(false);
  });

  it('atualiza filter', () => {
    const { result } = renderHook(() => useBookingFilters());

    act(() => result.current.setFilter('free'));
    expect(result.current.filter).toBe('free');

    act(() => result.current.setFilter('blocked'));
    expect(result.current.filter).toBe('blocked');
  });

  it('registra listener de resize', () => {
    renderHook(() => useBookingFilters());
    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('limpa listener de resize no unmount', () => {
    const { unmount } = renderHook(() => useBookingFilters());
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
