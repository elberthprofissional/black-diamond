import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRevenueChartData } from './useRevenueChartData';
import type { Booking } from '../types';

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: `b-${Math.random().toString(36).slice(2, 8)}`,
    client_id: 'client-1',
    booking_date: '2026-07-15',
    booking_time: '14:00:00',
    status: 'completed',
    total_price: 50,
    total_duration: 30,
    service_ids: ['s1'],
    is_blocked: false,
    discount_amount: 0,
    created_at: '2026-07-15T10:00:00Z',
    ...overrides,
  };
}

describe('useRevenueChartData', () => {
  it('returns empty state for empty bookings', () => {
    const { result } = renderHook(() => useRevenueChartData([]));
    expect(result.current.totalRevenue).toBe(0);
    expect(result.current.totalCompleted).toBe(0);
    expect(result.current.dailyRevenue).toHaveLength(31); // July has 31 days
    expect(result.current.dailyAverage).toBe(0);
    expect(result.current.bestDay).toBeNull();
    expect(result.current.dailyRevenue.every((d) => d.value === 0)).toBe(true);
  });

  it('filters only completed bookings', () => {
    const bookings = [
      makeBooking({ status: 'completed', total_price: 100 }),
      makeBooking({ status: 'pending', total_price: 50 }),
      makeBooking({ status: 'cancelled', total_price: 30 }),
    ];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    expect(result.current.totalCompleted).toBe(1);
    expect(result.current.totalRevenue).toBe(100);
  });

  it('calculates daily revenue correctly', () => {
    const bookings = [
      makeBooking({ booking_date: '2026-07-05', total_price: 100 }),
      makeBooking({ booking_date: '2026-07-05', total_price: 50 }),
      makeBooking({ booking_date: '2026-07-10', total_price: 75 }),
    ];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    const day05 = result.current.dailyRevenue.find((d) => d.day === '05');
    expect(day05).toBeDefined();
    expect(day05!.value).toBe(150);
    expect(day05!.count).toBe(2);

    const day10 = result.current.dailyRevenue.find((d) => d.day === '10');
    expect(day10).toBeDefined();
    expect(day10!.value).toBe(75);
    expect(day10!.count).toBe(1);

    const day01 = result.current.dailyRevenue.find((d) => d.day === '01');
    expect(day01!.value).toBe(0);
  });

  it('calculates day of week distribution', () => {
    const bookings = [
      makeBooking({ booking_date: '2026-07-15', total_price: 100 }), // Wednesday
      makeBooking({ booking_date: '2026-07-16', total_price: 50 }), // Thursday
    ];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    const wed = result.current.dayOfWeekRevenue.find((d) => d.day === 3);
    expect(wed).toBeDefined();
    expect(wed!.value).toBe(100);
    const thu = result.current.dayOfWeekRevenue.find((d) => d.day === 4);
    expect(thu).toBeDefined();
    expect(thu!.value).toBe(50);
  });

  it('finds the best day', () => {
    const bookings = [
      makeBooking({ booking_date: '2026-07-05', total_price: 50 }),
      makeBooking({ booking_date: '2026-07-10', total_price: 200 }),
      makeBooking({ booking_date: '2026-07-15', total_price: 100 }),
    ];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    expect(result.current.bestDay).not.toBeNull();
    expect(result.current.bestDay!.value).toBe(200);
  });

  it('calculates daily average correctly', () => {
    const bookings = [
      makeBooking({ booking_date: '2026-07-05', total_price: 100 }),
      makeBooking({ booking_date: '2026-07-10', total_price: 200 }),
    ];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    expect(result.current.dailyAverage).toBe(150);
  });

  it('handles bookings outside current month/year', () => {
    const bookings = [makeBooking({ booking_date: '2025-01-15', total_price: 99 })];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    expect(result.current.totalRevenue).toBe(99);
    expect(result.current.totalCompleted).toBe(1);
    expect(result.current.dailyRevenue.every((d) => d.value === 0)).toBe(true);
  });

  it('handles bookings with invalid dates (revenue counted, not charted)', () => {
    const bookings = [makeBooking({ booking_date: 'invalid-date', total_price: 50 })];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    // Revenue is counted from completed bookings even if date is bad
    expect(result.current.totalRevenue).toBe(50);
    expect(result.current.totalCompleted).toBe(1);
    // But not charted in daily/weekly/monthly
    expect(result.current.dailyRevenue.every((d) => d.value === 0)).toBe(true);
    // bestDay should be based on charted data, so should be null
    expect(result.current.bestDay).toBeNull();
  });

  it('handles bookings with no price', () => {
    const bookings = [makeBooking({ total_price: undefined as unknown as number })];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    expect(result.current.totalRevenue).toBe(0);
  });

  it('includes Sunday at the end of dayOfWeekRevenue', () => {
    const bookings = [
      makeBooking({ booking_date: '2026-07-19', total_price: 50 }), // Sunday
    ];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    const last = result.current.dayOfWeekRevenue[result.current.dayOfWeekRevenue.length - 1];
    expect(last.day).toBe(0);
    expect(last.value).toBe(50);
    expect(last.shortLabel).toBe('Dom');
  });

  it('generates label with day name for dailyRevenue', () => {
    const bookings = [makeBooking({ booking_date: '2026-07-15', total_price: 50 })];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    const day15 = result.current.dailyRevenue.find((d) => d.day === '15');
    expect(day15).toBeDefined();
    // July 15 2026 is a Wednesday (quarta-feira in pt-BR => qua)
    expect(day15!.label).toContain('15');
  });

  it('generates monthly comparison from available data', () => {
    const bookings = [
      makeBooking({ booking_date: '2026-06-15', total_price: 200 }),
      makeBooking({ booking_date: '2026-07-15', total_price: 100 }),
    ];
    const { result } = renderHook(() => useRevenueChartData(bookings));
    expect(result.current.monthlyComparison.length).toBeGreaterThanOrEqual(2);
    const jul = result.current.monthlyComparison.find((m) => m.month === '2026-07');
    expect(jul).toBeDefined();
    expect(jul!.value).toBe(100);
  });
});
