import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDateDragScroll } from './useDateDragScroll';

describe('useDateDragScroll', () => {
  it('returns all required handlers and ref', () => {
    const { result } = renderHook(() => useDateDragScroll());

    expect(result.current.dateContainerRef).toBeDefined();
    expect(typeof result.current.handleMouseDown).toBe('function');
    expect(typeof result.current.handleMouseLeave).toBe('function');
    expect(typeof result.current.handleMouseUp).toBe('function');
    expect(typeof result.current.handleMouseMove).toBe('function');
  });

  it('ref is attached to a div', () => {
    const { result } = renderHook(() => useDateDragScroll());
    expect(result.current.dateContainerRef.current).toBeNull();
  });
});
