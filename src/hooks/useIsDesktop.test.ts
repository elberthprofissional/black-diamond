import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsDesktop } from './useIsDesktop';

describe('useIsDesktop', () => {
  beforeEach(() => {
    // Default: 1024px viewport
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when viewport >= breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it('returns false when viewport < breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it('uses custom breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
    const { result } = renderHook(() => useIsDesktop(768));
    expect(result.current).toBe(true);
  });

  it('updates on resize from desktop to mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(false);
  });

  it('updates on resize from mobile to desktop', () => {
    Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(true);
  });

  it('handles exact breakpoint boundary (>=)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1023, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(false);
  });

  it('removes event listener on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useIsDesktop());
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
