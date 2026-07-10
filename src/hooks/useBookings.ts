import { useState, useEffect, useCallback, useRef } from 'react';
import { getBookings, autoCompleteExpiredBookings } from '../lib/api';
import type { BookingWithClient } from '../types';

export function useBookings(date?: string) {
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchRef = useRef<() => void>(() => {});
  const autoCompleteScheduledRef = useRef(false);

  const fetchBookings = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await getBookings(date);
      if (controller.signal.aborted) return;
      setBookings((result.data || []) as BookingWithClient[]);

      // Schedule autoComplete only if not already scheduled (prevents race condition)
      if (date && !autoCompleteScheduledRef.current) {
        autoCompleteScheduledRef.current = true;
        autoCompleteExpiredBookings(date)
          .then((count) => {
            autoCompleteScheduledRef.current = false;
            if (controller.signal.aborted) return;
            if (count > 0) {
              fetchRef.current();
            }
          })
          .catch(() => {
            autoCompleteScheduledRef.current = false;
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

  fetchRef.current = fetchBookings;

  useEffect(() => {
    fetchBookings();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
}
