import { useEffect, useRef } from 'react';

type RouteModule = () => Promise<{ default: React.ComponentType }>;

const prefetched = new Set<string>();

/**
 * Prefetches a route module on hover/focus for faster navigation.
 * Usage: usePrefetchRoute('/admin', () => import('./pages/AdminDashboard'));
 */
export function usePrefetchRoute(path: string, loader: RouteModule) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (prefetched.has(path)) return;

    const prefetch = () => {
      if (prefetched.has(path)) return;
      prefetched.add(path);
      loaderRef.current().catch(() => {
        prefetched.delete(path);
      });
    };

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

    const link = document.querySelector(`a[href="${path}"]`);
    if (link) {
      observer.observe(link);
    }

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
  }, [path]);
}
