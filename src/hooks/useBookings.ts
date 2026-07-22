import { useState, useEffect, useCallback, useRef } from 'react';
import { getBookings } from '../lib/api';
import { logError } from '../lib/logger';
import { STORAGE_BOOKINGS_CACHE } from '../lib/constants';
import type { BookingWithClient } from '../types';

interface CacheEntry {
  data: BookingWithClient[];
  /** Data dos agendamentos (booking_date), não a data em que foi salvo */
  bookingDate: string;
  /** Timestamp de quando o cache foi criado */
  timestamp: number;
}

/**
 * Carrega cache offline do localStorage.
 * Só retorna dados se:
 *  - O cache existir
 *  - A data do cache bater com a data solicitada
 *  - O cache tiver menos de 24 horas
 */
function loadBookingsCache(requestedDate?: string): BookingWithClient[] | null {
  if (!requestedDate) return null;
  try {
    const stored = localStorage.getItem(STORAGE_BOOKINGS_CACHE);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as CacheEntry;
    // Verifica se a data do cache bate com a data solicitada
    if (parsed.bookingDate !== requestedDate) return null;
    // Cache válido por 24 horas
    if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) return null;
    return parsed.data;
  } catch (e) {
    logError(e);
  }
  return null;
}

/** Salva cache offline no localStorage com a data dos agendamentos */
function saveBookingsCache(data: BookingWithClient[], bookingDate?: string) {
  if (!bookingDate) return;
  try {
    const entry: CacheEntry = {
      data,
      bookingDate,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_BOOKINGS_CACHE, JSON.stringify(entry));
  } catch (e) {
    logError(e);
  }
}

export function useBookings(date?: string, barberId?: string) {
  const [bookings, setBookings] = useState<BookingWithClient[]>(
    () => loadBookingsCache(date) || []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // isCached começa true se o estado inicial veio do cache
  const [isCached, setIsCached] = useState(() => loadBookingsCache(date) !== null);
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
      setIsCached(false);
      // Salva no cache offline com a data dos agendamentos
      saveBookingsCache(data, date);
    } catch (err) {
      if (controller.signal.aborted) return;
      // Se falhou, tenta usar cache offline
      const cached = loadBookingsCache(date);
      if (cached) {
        setBookings(cached);
        setIsCached(true);
      } else {
        setError(err instanceof Error ? err : new Error('Erro ao carregar agendamentos.'));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [date, barberId]);

  // Monitora conectividade pra recarregar quando voltar online
  useEffect(() => {
    const handleOnline = () => {
      // Recarrega silenciosamente quando voltar online
      getBookings(date, { barberId })
        .then((result) => {
          const data = (result.data || []) as BookingWithClient[];
          setBookings(data);
          setIsCached(false);
          saveBookingsCache(data, date);
        })
        .catch(() => {
          // Se falhou mesmo online, só ignora
        });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [date, barberId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchBookings]);

  return { bookings, loading, error, isCached, refetch: fetchBookings };
}
