import { useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { getBookings, getServices } from '../lib/api';
import type { Booking, Service } from '../types';

interface TopService {
  name: string;
  count: number;
}

export interface ProfileStats {
  lucroTotal: number;
  lucroMes: number;
  lucroSemana: number;
  canceladosMes: number;
  canceladosSemana: number;
  concluidosMes: number;
  concluidosSemana: number;
  topServices: TopService[];
}

const bookingsQueryKey = ['profile', 'bookings'] as const;
const servicesQueryKey = ['profile', 'services'] as const;

function computeStats(bookings: Booking[], services: Service[]): ProfileStats {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();

  if (dayOfWeek === 0) {
    startOfWeek.setHours(0, 0, 0, 0);
  } else if (dayOfWeek === 6 && now.getHours() >= 20) {
    startOfWeek.setDate(now.getDate() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
  } else {
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
  }

  let lucroTotal = 0;
  let lucroMes = 0;
  let canceladosMes = 0;
  let concluidosMes = 0;
  const serviceCountsMes: Record<string, number> = {};
  let lucroSemana = 0;
  let canceladosSemana = 0;
  let concluidosSemana = 0;
  const serviceCountsSemana: Record<string, number> = {};

  (bookings || []).forEach((b) => {
    if (!b || !b.booking_date) return;
    const parts = b.booking_date.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(date.getTime())) return;

    const price = Number(b.total_price || 0);

    if (b.status === 'completed') lucroTotal += price;

    if (date >= startOfMonth) {
      if (b.status === 'cancelled') canceladosMes++;
      else if (b.status === 'completed') {
        lucroMes += price;
        concluidosMes++;
        if (Array.isArray(b.service_ids)) {
          b.service_ids.forEach((id) => {
            if (id) serviceCountsMes[id] = (serviceCountsMes[id] || 0) + 1;
          });
        }
      }
    }

    if (date >= startOfWeek) {
      if (b.status === 'cancelled') canceladosSemana++;
      else if (b.status === 'completed') {
        lucroSemana += price;
        concluidosSemana++;
        if (Array.isArray(b.service_ids)) {
          b.service_ids.forEach((id) => {
            if (id) serviceCountsSemana[id] = (serviceCountsSemana[id] || 0) + 1;
          });
        }
      }
    }
  });

  const currentServiceCounts = serviceCountsMes;
  const topServices: TopService[] = (services || [])
    .filter((srv) => srv && srv.id && srv.name)
    .map((srv) => ({
      name: srv.name,
      count: currentServiceCounts[srv.id] || 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    lucroTotal,
    lucroMes,
    lucroSemana,
    canceladosMes,
    canceladosSemana,
    concluidosMes,
    concluidosSemana,
    topServices,
  };
}

/**
 * Hook para carregar estatísticas do perfil via React Query.
 *
 * - Busca bookings + services em paralelo com useQueries
 * - Calcula stats com useMemo
 * - Refetch automático a cada 3 min (via refetchInterval)
 * - Refetch ao focar a janela
 */
export function useProfileStats() {
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: [
      {
        queryKey: bookingsQueryKey,
        queryFn: async () => {
          const result = await getBookings();
          return (result.data || []) as Booking[];
        },
        staleTime: 3 * 60 * 1000,
        refetchInterval: 3 * 60 * 1000,
      },
      {
        queryKey: servicesQueryKey,
        queryFn: getServices,
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const [bookingsQuery, servicesQuery] = results;

  const bookings = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);
  const services = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const loading = bookingsQuery.isLoading || servicesQuery.isLoading;

  const stats = useMemo(() => computeStats(bookings, services), [bookings, services]);

  return {
    bookings,
    services,
    loading,
    stats,
    loadData: () => {
      queryClient.invalidateQueries({ queryKey: bookingsQueryKey });
      queryClient.invalidateQueries({ queryKey: servicesQueryKey });
    },
  };
}
