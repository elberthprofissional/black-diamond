import { useState, useEffect, useMemo } from 'react';
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
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(now.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

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
      else {
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
      else {
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

  const currentServiceCounts = serviceCountsSemana;
  const topServices: TopService[] = (services || [])
    .filter((srv) => srv && srv.id && srv.name)
    .map((srv) => ({
      name: srv.name,
      count: currentServiceCounts[srv.id] || 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    lucroTotal, lucroMes, lucroSemana,
    canceladosMes, canceladosSemana,
    concluidosMes, concluidosSemana,
    topServices,
  };
}

export function useProfileStats() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [bookingsData, servicesData] = await Promise.all([getBookings(), getServices()]);
      setBookings(bookingsData || []);
      setServices(servicesData || []);
    } catch {
      // ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => computeStats(bookings, services), [bookings, services]);

  return {
    bookings, services, loading, stats,
    loadData, setBookings, setServices, setLoading,
  };
}
