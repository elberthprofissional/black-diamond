import { useState, useEffect, useCallback, useRef } from 'react';
import { getBookings, autoCompleteExpiredBookings } from '../lib/api';
import type { BookingWithClient } from '../types';

export function useBookings(date?: string) {
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBookings = useCallback(async () => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await getBookings(date);
      if (controller.signal.aborted) return;
      setBookings((data || []) as BookingWithClient[]);

      if (date) {
        autoCompleteExpiredBookings(date)
          .then((count) => {
            if (controller.signal.aborted) return;
            if (count > 0) {
              setBookings(prev => {
                const hasExpired = prev.some(b =>
                  b.status !== 'completed' && b.status !== 'cancelled'
                );
                if (!hasExpired) return prev;
                return prev.map(b =>
                  b.status !== 'completed' && b.status !== 'cancelled'
                    ? { ...b, status: 'completed' as const }
                    : b
                );
              });
            }
          })
          .catch(() => {
            // Silently ignore — auto-complete is best-effort
          });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error('Failed to fetch bookings'));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [date]);

  useEffect(() => {
    fetchBookings();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
}
