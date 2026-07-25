import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollLock } from './useScrollLock';

describe('useScrollLock', () => {
  const originalStyles: Record<string, string> = {};

  beforeEach(() => {
    // Save original body and html styles
    originalStyles.bodyOverflow = document.body.style.overflow;
    originalStyles.bodyPosition = document.body.style.position;
    originalStyles.bodyWidth = document.body.style.width;
    originalStyles.bodyHeight = document.body.style.height;
    originalStyles.bodyOverscroll = document.body.style.overscrollBehavior;
    originalStyles.htmlOverscroll = document.documentElement.style.overscrollBehavior;
  });

  afterEach(() => {
    // Restore original styles
    document.body.style.overflow = originalStyles.bodyOverflow;
    document.body.style.position = originalStyles.bodyPosition;
    document.body.style.width = originalStyles.bodyWidth;
    document.body.style.height = originalStyles.bodyHeight;
    document.body.style.overscrollBehavior = originalStyles.bodyOverscroll;
    document.documentElement.style.overscrollBehavior = originalStyles.htmlOverscroll;
  });

  it('aplica estilos de lock no body e html', () => {
    renderHook(() => useScrollLock());

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.width).toBe('100%');
    expect(document.body.style.height).toBe('100%');
    expect(document.body.style.overscrollBehavior).toBe('none');
    expect(document.documentElement.style.overscrollBehavior).toBe('none');
  });

  it('restaura estilos originais ao desmontar', () => {
    // Set initial styles
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.body.style.width = 'auto';
    document.body.style.height = 'auto';
    document.body.style.overscrollBehavior = 'auto';
    document.documentElement.style.overscrollBehavior = 'auto';

    const { unmount } = renderHook(() => useScrollLock());

    // Verify lock applied
    expect(document.body.style.overflow).toBe('hidden');

    // Unmount and verify restore
    unmount();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.position).toBe('static');
    expect(document.body.style.width).toBe('auto');
    expect(document.body.style.height).toBe('auto');
    expect(document.body.style.overscrollBehavior).toBe('auto');
    expect(document.documentElement.style.overscrollBehavior).toBe('auto');
  });

  it('restaura estilos undefined corretamente (sem valores prévios)', () => {
    const { unmount } = renderHook(() => useScrollLock());

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    // Should restore to empty string (no previous style)
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
    expect(document.body.style.width).toBe('');
    expect(document.body.style.height).toBe('');
  });

  it('aplica lock apenas uma vez mesmo com re-renders', () => {
    const { rerender } = renderHook(() => useScrollLock());

    expect(document.body.style.overflow).toBe('hidden');

    rerender();
    expect(document.body.style.overflow).toBe('hidden');
  });
});
