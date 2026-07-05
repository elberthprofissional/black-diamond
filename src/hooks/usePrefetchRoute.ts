import { useEffect } from 'react';

type RouteModule = () => Promise<{ default: React.ComponentType }>;

const prefetched = new Set<string>();

/**
 * Prefetches a route module on hover/focus for faster navigation.
 * Usage: usePrefetchRoute('/admin', () => import('./pages/AdminDashboard'));
 */
export function usePrefetchRoute(path: string, loader: RouteModule) {
  useEffect(() => {
    if (prefetched.has(path)) return;

    const prefetch = () => {
      if (prefetched.has(path)) return;
      prefetched.add(path);
      loader().catch(() => {
        // Silently ignore prefetch failures
        prefetched.delete(path);
      });
    };

    // Prefetch on viewport intersection for links that might be navigated to
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            prefetch();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );

    // Find the link element for this path
    const link = document.querySelector(`a[href="${path}"]`);
    if (link) {
      observer.observe(link);
    }

    // Also prefetch on hover/focus events
    const handleMouseEnter = () => prefetch();
    const handleFocus = () => prefetch();

    if (link) {
      link.addEventListener('mouseenter', handleMouseEnter);
      link.addEventListener('focus', handleFocus);
    }

    return () => {
      observer.disconnect();
      if (link) {
        link.removeEventListener('mouseenter', handleMouseEnter);
        link.removeEventListener('focus', handleFocus);
      }
    };
  }, [path, loader]);
}
