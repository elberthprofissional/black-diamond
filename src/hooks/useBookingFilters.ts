import { useState, useEffect } from 'react';

export function useBookingFilters() {
  const [filter, setFilter] = useState<'occupied' | 'free' | 'blocked'>('occupied');
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return { filter, setFilter, isDesktop };
}
