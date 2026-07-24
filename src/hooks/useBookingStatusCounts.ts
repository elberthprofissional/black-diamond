import { useMemo } from 'react';
import type { BookingWithClient } from '../types';

interface BookingStatusCounts {
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
}

export function useBookingStatusCounts(bookings: BookingWithClient[]): BookingStatusCounts {
  return useMemo(() => {
    let completedCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;

    for (const b of bookings) {
      if (b.status === 'completed') completedCount++;
      else if (b.status === 'cancelled') cancelledCount++;
      if (b.no_show) noShowCount++;
    }

    return { completedCount, cancelledCount, noShowCount };
  }, [bookings]);
}
