import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBookings } from '../lib/api';
import { logError } from '../lib/logger';
import { fireAndForget } from '../lib/fire-and-forget';
import { STORAGE_BOOKINGS_CACHE } from '../lib/constants';
import type { BookingWithClient } from '../types';

interface CacheEntry {
  data: BookingWithClient[];
  bookingDate: string;
  timestamp: number;
}

function getBookingsQueryKey(date?: string, barberId?: string) {
  return ['bookings', date ?? 'all', barberId ?? 'all'] as const;
}

function loadBookingsCache(requestedDate?: string): BookingWithClient[] | null {
  if (!requestedDate) return null;
  try {
    const stored = localStorage.getItem(STORAGE_BOOKINGS_CACHE);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as CacheEntry;
    if (parsed.bookingDate !== requestedDate) return null;
    if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) return null;
    return parsed.data;
  } catch (e) {
    logError(e);
  }
  return null;
}

function saveBookingsCache(data: BookingWithClient[], bookingDate?: string) {
  if (!bookingDate) return;
  try {
    const entry: CacheEntry = { data, bookingDate, timestamp: Date.now() };
    localStorage.setItem(STORAGE_BOOKINGS_CACHE, JSON.stringify(entry));
  } catch (e) {
    logError(e);
  }
}

async function fetchBookings(date?: string, barberId?: string): Promise<BookingWithClient[]> {
  const result = await getBookings(date, { barberId });
  const data = (result.data || []) as BookingWithClient[];
  // Atualiza cache offline
  saveBookingsCache(data, date);
  return data;
}

/**
 * Hook para carregar e gerenciar agendamentos via React Query.
 *
 * - Cache offline: armazena no localStorage (válido por 24h)
 * - Exibe placeholderData do cache enquanto carrega dados frescos
 * - Monitora evento `online` para recarregar silenciosamente
 * - Usa query cancellation do React Query para evitar race conditions
 *
 * @param date - Data no formato 'YYYY-MM-DD'
 * @param barberId - ID do barbeiro para filtrar
 */
export function useBookings(date?: string, barberId?: string) {
  const queryClient = useQueryClient();
  // Memoiado por (date) para evitar reavaliar o cache a cada render
  // e gerar placeholderData com referência instável.
  const cache = useMemo(() => loadBookingsCache(date), [date]);

  const query = useQuery({
    queryKey: getBookingsQueryKey(date, barberId),
    queryFn: () => fetchBookings(date, barberId),
    // Mostra dados do cache imediatamente enquanto carrega
    placeholderData: cache ?? undefined,
    staleTime: 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 min no cache (antes chamado de cacheTime)
  });

  // Monitora conectividade pra recarregar quando voltar online
  useEffect(() => {
    const handleOnline = () => {
      fireAndForget(
        queryClient.invalidateQueries({ queryKey: getBookingsQueryKey(date, barberId) }),
        { context: 'useBookings/onlineRefresh' }
      );
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [date, barberId, queryClient]);

  // isCached: true quando os dados vieram do cache offline
  const isCached = query.isPlaceholderData && cache !== null;

  return {
    bookings: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    isCached,
    refetch: () => query.refetch(),
  };
}
