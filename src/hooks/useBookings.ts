import { useState, useEffect, useCallback, useRef } from 'react';
import { getBookings } from '../lib/api';
import type { BookingWithClient } from '../types';

export function useBookings(date?: string, barberId?: string) {
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBookings = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await getBookings(date, { barberId });
      if (controller.signal.aborted) return;
      const data = (result.data || []) as BookingWithClient[];
      setBookings(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error('Erro ao carregar agendamentos.'));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [date, barberId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
}
