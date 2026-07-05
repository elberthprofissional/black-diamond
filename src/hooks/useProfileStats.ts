import { useState, useEffect, useMemo, useCallback } from 'react';
import { getBookings, getServices } from '../lib/api';
import type { Booking, Service } from '../types';

export interface TopService {
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

function computeStats(bookings: Booking[], services: Service[]): ProfileStats {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Business week: Sunday 00:00 to Saturday 20:00 (closing time)
  // After Saturday 20:00, the week has ended and next week starts
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat

  if (dayOfWeek === 0) {
    // Sunday: week just started, use today
    startOfWeek.setHours(0, 0, 0, 0);
  } else if (dayOfWeek === 6 && now.getHours() >= 20) {
    // Saturday after 20:00: shop closed, next week starts
    startOfWeek.setDate(now.getDate() + 1); // jump to Sunday
    startOfWeek.setHours(0, 0, 0, 0);
  } else {
    // Mon-Sat before 20:00: go back to last Sunday
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

    if (b.status !== 'cancelled') lucroTotal += price;

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
    .sort((a, b) => b.count - a.count);

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

export function useProfileStats() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [bookingsData, servicesData] = await Promise.all([getBookings(), getServices()]);
      setBookings(bookingsData || []);
      setServices(servicesData || []);
    } catch {
      // ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 3 minutes to keep stats current
  useEffect(() => {
    const interval = setInterval(
      () => {
        loadData();
      },
      3 * 60 * 1000
    );
    return () => clearInterval(interval);
  }, [loadData]);

  const stats = useMemo(() => computeStats(bookings, services), [bookings, services]);

  return {
    bookings,
    services,
    loading,
    stats,
    loadData,
    setBookings,
    setServices,
    setLoading,
  };
}
