import { useState, useEffect, useCallback } from 'react';
import { getBookings } from '../lib/api';
import type { BookingWithClient } from '../types';

export function useBookings(date?: string) {
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBookings(date);
      setBookings((data || []) as BookingWithClient[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch bookings'));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (active) {
        await fetchBookings();
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
}
