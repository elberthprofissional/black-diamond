import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface BarberMonthlyStats {
  totalClients: number;
  totalRevenue: number;
  completedCount: number;
  cancelledCount: number;
  topServiceName: string;
  topServiceCount: number;
  completionRate: number;
}

async function fetchBarberMonthlyStats(barberId?: string): Promise<BarberMonthlyStats> {
  if (!barberId) {
    return {
      totalClients: 0,
      totalRevenue: 0,
      completedCount: 0,
      cancelledCount: 0,
      topServiceName: '',
      topServiceCount: 0,
      completionRate: 0,
    };
  }

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]!;

  const { data, error } = await supabase
    .from('bookings')
    .select('status, total_price, client_id, service_ids')
    .eq('barber_id', barberId)
    .gte('booking_date', firstDay)
    .lte('booking_date', lastDay);

  if (error || !data) {
    return {
      totalClients: 0,
      totalRevenue: 0,
      completedCount: 0,
      cancelledCount: 0,
      topServiceName: '',
      topServiceCount: 0,
      completionRate: 0,
    };
  }

  const completed = data.filter((b) => b.status === 'completed');
  const cancelled = data.filter((b) => b.status === 'cancelled');
  const total = data.length;

  // Contagem de serviços
  const serviceCountMap = new Map<string, number>();
  for (const booking of completed) {
    if (booking.service_ids) {
      for (const sid of booking.service_ids) {
        serviceCountMap.set(sid, (serviceCountMap.get(sid) || 0) + 1);
      }
    }
  }

  let topServiceId = '';
  let topServiceCount = 0;
  for (const [sid, count] of serviceCountMap) {
    if (count > topServiceCount) {
      topServiceId = sid;
      topServiceCount = count;
    }
  }

  // Busca nome do serviço mais feito
  let topServiceName = '';
  if (topServiceId) {
    const { data: svc } = await supabase
      .from('services')
      .select('name')
      .eq('id', topServiceId)
      .single();
    topServiceName = svc?.name || '';
  }

  // Clientes únicos
  const uniqueClients = new Set(data.map((b) => b.client_id).filter(Boolean));

  return {
    totalClients: uniqueClients.size,
    totalRevenue: completed.reduce((sum, b) => sum + Number(b.total_price || 0), 0),
    completedCount: completed.length,
    cancelledCount: cancelled.length,
    topServiceName,
    topServiceCount,
    completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
  };
}

const barberStatsQueryKey = (barberId?: string) => ['barberStats', barberId] as const;

export function useBarberStats(barberId?: string) {
  const query = useQuery({
    queryKey: barberStatsQueryKey(barberId),
    queryFn: () => fetchBarberMonthlyStats(barberId),
    staleTime: 5 * 60 * 1000,
    enabled: !!barberId,
  });

  const stats = useMemo(
    () =>
      query.data ?? {
        totalClients: 0,
        totalRevenue: 0,
        completedCount: 0,
        cancelledCount: 0,
        topServiceName: '',
        topServiceCount: 0,
        completionRate: 0,
      },
    [query.data]
  );

  return { stats, loading: query.isLoading, refetch: () => query.refetch() };
}
