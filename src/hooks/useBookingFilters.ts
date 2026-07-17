import { useState } from 'react';
import { useIsDesktop } from './useIsDesktop';

export function useBookingFilters() {
  const [filter, setFilter] = useState<'occupied' | 'free' | 'blocked'>('occupied');
  const isDesktop = useIsDesktop();

  return { filter, setFilter, isDesktop };
}
