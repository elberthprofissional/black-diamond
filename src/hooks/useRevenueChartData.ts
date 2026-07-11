import { useMemo } from 'react';
import type { Booking } from '../types';

export interface DailyRevenue {
  day: string;
  label: string;
  value: number;
  count: number;
}

export interface MonthlyRevenue {
  month: string;
  label: string;
  value: number;
  count: number;
}

export interface RevenueChartData {
  dailyRevenue: DailyRevenue[];
  weeklyRevenue: DailyRevenue[];
  monthlyRevenue: MonthlyRevenue[];
  monthlyComparison: MonthlyRevenue[];
  dailyAverage: number;
  bestDay: { label: string; value: number } | null;
  totalRevenue: number;
  totalCompleted: number;
}

function getWeekId(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export function useRevenueChartData(bookings: Booking[]): RevenueChartData {
  return useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const completed = bookings.filter((b) => b.status === 'completed' && b.booking_date);

    // --- Daily revenue (current month) ---
    const dailyMap = new Map<string, { value: number; count: number }>();
    const monthlyMap = new Map<string, { value: number; count: number }>();
    const weeklyMap = new Map<string, { value: number; count: number }>();

    completed.forEach((b) => {
      const parts = b.booking_date.split('-');
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (isNaN(date.getTime())) return;
      const price = Number(b.total_price || 0);

      // Daily (current month only)
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        const dayKey = String(date.getDate()).padStart(2, '0');
        const existing = dailyMap.get(dayKey) || { value: 0, count: 0 };
        existing.value += price;
        existing.count += 1;
        dailyMap.set(dayKey, existing);
      }

      // Weekly (last 8 weeks)
      const weekKey = getWeekId(date);
      const weekExisting = weeklyMap.get(weekKey) || { value: 0, count: 0 };
      weekExisting.value += price;
      weekExisting.count += 1;
      weeklyMap.set(weekKey, weekExisting);

      // Monthly (last 12 months)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthExisting = monthlyMap.get(monthKey) || { value: 0, count: 0 };
      monthExisting.value += price;
      monthExisting.count += 1;
      monthlyMap.set(monthKey, monthExisting);
    });

    // Build daily revenue array (current month)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyRevenue: DailyRevenue[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = String(d).padStart(2, '0');
      const data = dailyMap.get(key) || { value: 0, count: 0 };
      const dateObj = new Date(currentYear, currentMonth, d);
      const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      dailyRevenue.push({
        day: key,
        label: `${d}\n${dayName}`,
        value: data.value,
        count: data.count,
      });
    }

    // Build weekly revenue (last 8 completed weeks + current)
    const weeklyRevenue: DailyRevenue[] = [];
    const sortedWeeks = Array.from(weeklyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    const recentWeeks = sortedWeeks.slice(-8);
    recentWeeks.forEach(([weekKey, data]) => {
      const [y, m, d] = weekKey.split('-');
      const weekDate = new Date(Number(y), Number(m) - 1, Number(d));
      const label = weekDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
      weeklyRevenue.push({
        day: weekKey,
        label,
        value: data.value,
        count: data.count,
      });
    });

    // Build monthly comparison (last 12 months)
    const monthlyRevenue: MonthlyRevenue[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyMap.get(key) || { value: 0, count: 0 };
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      monthlyRevenue.push({
        month: key,
        label,
        value: data.value,
        count: data.count,
      });
    }

    // Monthly comparison (last 12 months, as far back as we have data)
    const monthlyComparison: MonthlyRevenue[] = [];
    const sortedMonths = Array.from(monthlyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    const recentMonths = sortedMonths.slice(-8);
    recentMonths.forEach(([monthKey, data]) => {
      const [y, m] = monthKey.split('-');
      const monthDate = new Date(Number(y), Number(m) - 1, 1);
      const label = monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyComparison.push({
        month: monthKey,
        label,
        value: data.value,
        count: data.count,
      });
    });

    // Daily average (current month)
    const totalMonthValue = dailyRevenue.reduce((sum, d) => sum + d.value, 0);
    const daysWithData = dailyRevenue.filter((d) => d.value > 0).length;
    const dailyAverage = daysWithData > 0 ? totalMonthValue / daysWithData : 0;

    // Best day (current month)
    const bestDayEntry = dailyRevenue.reduce(
      (best, curr) => (curr.value > (best?.value || 0) ? curr : best),
      null as DailyRevenue | null
    );
    const bestDay =
      bestDayEntry && bestDayEntry.value > 0
        ? { label: bestDayEntry.label.split('\n')[0], value: bestDayEntry.value }
        : null;

    // Total revenue and count for the period
    const totalRevenue = completed.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
    const totalCompleted = completed.length;

    return {
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      monthlyComparison,
      dailyAverage,
      bestDay,
      totalRevenue,
      totalCompleted,
    };
  }, [bookings]);
}
