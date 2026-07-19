import { useEffect } from 'react';

/**
 * Locks body scroll, overscroll bounce, and fixed positioning.
 * Restores all styles on unmount.
 */
export function useScrollLock(): void {
  useEffect(() => {
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevWidth = document.body.style.width;
    const prevHeight = document.body.style.height;

    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      document.documentElement.style.overscrollBehavior = prevOverscroll;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.width = prevWidth;
      document.body.style.height = prevHeight;
    };
  }, []);
}
