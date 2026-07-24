import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/utils';
import { logError } from '../lib/logger';

interface WeekData {
  /** Receita total da semana (soma de total_price dos completed) */
  revenue: number;
  /** Quantidade de agendamentos concluídos */
  count: number;
  /** Receita por dia da semana (0=domingo, 1=segunda...) */
  daily: number[];
}

interface WeeklyRevenueData {
  currentWeek: WeekData;
  lastWeek: WeekData;
  /** Variação percentual: (current - last) / last * 100 */
  changePercent: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Obtém o range (início, fim) de uma semana relativa à semana atual.
 * @param weeksAgo 0 = semana atual, 1 = semana passada, etc.
 */
function getWeekRange(weeksAgo = 0): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: getLocalDateString(monday),
    end: getLocalDateString(sunday),
  };
}

/**
 * Hook que calcula a receita semanal com comparação vs semana anterior.
 *
 * Busca bookings com status 'completed' da semana atual e da semana anterior,
 * soma os total_price e retorna os dados para exibição no dashboard.
 * Quando barberId é informado, filtra apenas os agendamentos daquele barbeiro.
 */
export function useWeeklyRevenue(barberId?: string): WeeklyRevenueData {
  const [currentWeek, setCurrentWeek] = useState<WeekData>({
    revenue: 0,
    count: 0,
    daily: Array(7).fill(0),
  });
  const [lastWeek, setLastWeek] = useState<WeekData>({
    revenue: 0,
    count: 0,
    daily: Array(7).fill(0),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const currentRange = getWeekRange(0);
      const lastRange = getWeekRange(1);

      // Constrói query condicional: filtra por barber_id se informado
      const buildQuery = (range: { start: string; end: string }) => {
        let q = supabase
          .from('bookings')
          .select('booking_date, total_price')
          .eq('status', 'completed')
          .gte('booking_date', range.start)
          .lte('booking_date', range.end);
        if (barberId) {
          q = q.eq('barber_id', barberId);
        }
        return q.order('booking_date', { ascending: true });
      };

      const [currentResult, lastResult] = await Promise.all([
        buildQuery(currentRange),
        buildQuery(lastRange),
      ]);

      if (controller.signal.aborted) return;

      if (currentResult.error) throw currentResult.error;
      if (lastResult.error) throw lastResult.error;

      const processWeek = (
        data: { booking_date: string; total_price: number | null }[],
        rangeStart: string
      ): WeekData => {
        const startDate = new Date(rangeStart);
        const daily = Array(7).fill(0);
        let revenue = 0;
        let count = 0;

        for (const booking of data || []) {
          const price = booking.total_price || 0;
          revenue += price;
          count++;

          const bookingDate = new Date(booking.booking_date);
          const diffDays = Math.round(
            (bookingDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
          );
          if (diffDays >= 0 && diffDays < 7) {
            daily[diffDays] += price;
          }
        }

        return { revenue, count, daily };
      };

      const weekCurrent = processWeek(currentResult.data || [], currentRange.start);
      const weekLast = processWeek(lastResult.data || [], lastRange.start);

      setCurrentWeek(weekCurrent);
      setLastWeek(weekLast);
    } catch (err) {
      if (controller.signal.aborted) return;
      logError(err, 'useWeeklyRevenue');
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de faturamento.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [barberId]);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const init = async () => {
      try {
        const currentRange = getWeekRange(0);
        const lastRange = getWeekRange(1);
        const buildQuery = (range: { start: string; end: string }) => {
          let q = supabase
            .from('bookings')
            .select('booking_date, total_price')
            .eq('status', 'completed')
            .gte('booking_date', range.start)
            .lte('booking_date', range.end);
          if (barberId) {
            q = q.eq('barber_id', barberId);
          }
          return q.order('booking_date', { ascending: true });
        };
        const [currentResult, lastResult] = await Promise.all([
          buildQuery(currentRange),
          buildQuery(lastRange),
        ]);
        if (controller.signal.aborted) return;
        if (currentResult.error) throw currentResult.error;
        if (lastResult.error) throw lastResult.error;
        const processWeek = (
          data: { booking_date: string; total_price: number | null }[],
          rangeStart: string
        ): WeekData => {
          const startDate = new Date(rangeStart);
          const daily = Array(7).fill(0);
          let revenue = 0;
          let count = 0;
          for (const booking of data || []) {
            const price = booking.total_price || 0;
            revenue += price;
            count++;
            const bookingDate = new Date(booking.booking_date);
            const diffDays = Math.round(
              (bookingDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
            );
            if (diffDays >= 0 && diffDays < 7) {
              daily[diffDays] += price;
            }
          }
          return { revenue, count, daily };
        };
        const weekCurrent = processWeek(currentResult.data || [], currentRange.start);
        const weekLast = processWeek(lastResult.data || [], lastRange.start);
        setCurrentWeek(weekCurrent);
        setLastWeek(weekLast);
      } catch (err) {
        if (controller.signal.aborted) return;
        logError(err, 'useWeeklyRevenue');
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados de faturamento.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    init();
    return () => {
      controller.abort();
    };
  }, [barberId]);

  const changePercent =
    lastWeek.revenue > 0
      ? ((currentWeek.revenue - lastWeek.revenue) / lastWeek.revenue) * 100
      : currentWeek.revenue > 0
        ? 100
        : 0;

  return {
    currentWeek,
    lastWeek,
    changePercent: Math.round(changePercent * 10) / 10,
    loading,
    error,
    refetch: fetchData,
  };
}
