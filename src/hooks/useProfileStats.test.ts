import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileStats } from './useProfileStats';
import type { Booking, Service } from '../types';

const mockGetBookings = vi.fn();
const mockGetServices = vi.fn();
const mockLogError = vi.fn();

vi.mock('../lib/api', () => ({
  getBookings: (...args: unknown[]) => mockGetBookings(...args),
  getServices: (...args: unknown[]) => mockGetServices(...args),
}));

vi.mock('../lib/logger', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

function makeBooking(overrides: Partial<Booking>): Booking {
  return {
    id: 'b1',
    client_id: 'c1',
    service_ids: [],
    booking_date: '2026-07-15',
    booking_time: '10:00:00',
    status: 'completed',
    total_price: 100,
    total_duration: 30,
    created_at: '2026-07-15T10:00:00Z',
    ...overrides,
  };
}

const mockServices: Service[] = [
  { id: 's1', name: 'Corte', price: 50, duration: 30 },
  { id: 's2', name: 'Barba', price: 30, duration: 20 },
];

describe('useProfileStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Wednesday July 15, 2026 at 12:00 local time
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0));
    mockGetBookings.mockResolvedValue({ data: [], error: null });
    mockGetServices.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts in loading state', () => {
    mockGetBookings.mockReturnValue(new Promise(() => {}));
    mockGetServices.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useProfileStats());
    expect(result.current.loading).toBe(true);
  });

  it('loads data and transitions to not loading', async () => {
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.bookings).toEqual([]);
    expect(result.current.services).toEqual([]);
  });

  it('computes lucroTotal from completed bookings across all dates', async () => {
    mockGetBookings.mockResolvedValue({
      data: [
        makeBooking({ booking_date: '2026-01-01', status: 'completed', total_price: 200 }),
        makeBooking({ id: 'b2', booking_date: '2026-03-10', status: 'completed', total_price: 50 }),
      ],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.lucroTotal).toBe(250);
  });

  it('does not count cancelled as lucroTotal', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ status: 'cancelled', total_price: 100 })],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.lucroTotal).toBe(0);
  });

  it('computes monthly stats for current month', async () => {
    mockGetBookings.mockResolvedValue({
      data: [
        makeBooking({ status: 'completed', total_price: 100, service_ids: ['s1', 's2'] }),
        makeBooking({ id: 'b2', status: 'cancelled', total_price: 50 }),
      ],
      error: null,
    });
    mockGetServices.mockResolvedValue(mockServices);
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.lucroMes).toBe(100);
    expect(result.current.stats.concluidosMes).toBe(1);
    expect(result.current.stats.canceladosMes).toBe(1);
  });

  it('computes weekly stats for current week (Wed)', async () => {
    // Wednesday July 15 — week started Sunday July 12
    mockGetBookings.mockResolvedValue({
      data: [
        makeBooking({ booking_date: '2026-07-14', status: 'completed', total_price: 80 }), // Tue
        makeBooking({ id: 'b2', booking_date: '2026-07-13', status: 'completed', total_price: 60 }), // Mon
        makeBooking({ id: 'b3', booking_date: '2026-07-11', status: 'completed', total_price: 40 }), // Sat before week
      ],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.lucroSemana).toBe(140);
    expect(result.current.stats.concluidosSemana).toBe(2);
  });

  it('counts weekly cancellations', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ booking_date: '2026-07-15', status: 'cancelled' })],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.canceladosSemana).toBe(1);
  });

  it('filters bookings with empty booking_date', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ booking_date: '' })],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.lucroTotal).toBe(0);
  });

  it('filters bookings with undefined booking_date', async () => {
    mockGetBookings.mockResolvedValue({
      data: [{ ...makeBooking({}), booking_date: undefined as unknown as string }],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.lucroTotal).toBe(0);
  });

  it('filters null bookings', async () => {
    mockGetBookings.mockResolvedValue({
      data: [null, makeBooking({ total_price: 50, status: 'completed' })],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.lucroTotal).toBe(50);
  });

  it('handles invalid booking_date (NaN date)', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ booking_date: 'invalid-date' })],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.lucroTotal).toBe(0);
  });

  it('computes top services sorted by count (max 3)', async () => {
    mockGetBookings.mockResolvedValue({
      data: [
        makeBooking({ status: 'completed', service_ids: ['s1'] }),
        makeBooking({ id: 'b2', status: 'completed', service_ids: ['s1'] }),
        makeBooking({ id: 'b3', status: 'completed', service_ids: ['s1'] }),
        makeBooking({ id: 'b4', status: 'completed', service_ids: ['s2'] }),
      ],
      error: null,
    });
    mockGetServices.mockResolvedValue(mockServices);
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.topServices).toEqual([
      { name: 'Corte', count: 3 },
      { name: 'Barba', count: 1 },
    ]);
  });

  it('filters out services with 0 count from topServices', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ status: 'completed', service_ids: ['s1'] })],
      error: null,
    });
    mockGetServices.mockResolvedValue(mockServices);
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.topServices.every((s) => s.count > 0)).toBe(true);
  });

  it('filters out services with null id', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ status: 'completed', service_ids: ['s1'] })],
      error: null,
    });
    mockGetServices.mockResolvedValue([
      { id: '', name: 'NoId', price: 10, duration: 10 },
      mockServices[0],
    ]);
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    const names = result.current.stats.topServices.map((s) => s.name);
    expect(names).toContain('Corte');
    expect(names).not.toContain('NoId');
  });

  it('filters out services with null name', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ status: 'completed', service_ids: ['s1'] })],
      error: null,
    });
    mockGetServices.mockResolvedValue([
      { id: 'x', name: '' as unknown as string, price: 10, duration: 10 },
      mockServices[0],
    ]);
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    const names = result.current.stats.topServices.map((s) => s.name);
    expect(names).toContain('Corte');
    expect(names).not.toContain('');
  });

  it('handles non-array service_ids gracefully', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ status: 'completed', service_ids: null as unknown as string[] })],
      error: null,
    });
    mockGetServices.mockResolvedValue(mockServices);
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.topServices).toEqual([]);
  });

  it('handles error in loadData gracefully', async () => {
    mockGetBookings.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(mockLogError).toHaveBeenCalled();
  });

  it('handles null data from getBookings', async () => {
    mockGetBookings.mockResolvedValue({ data: null });
    mockGetServices.mockResolvedValue(null);
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.bookings).toEqual([]);
    expect(result.current.services).toEqual([]);
  });

  it('handles null services gracefully in computeStats', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ status: 'completed', total_price: 100 })],
      error: null,
    });
    mockGetServices.mockResolvedValue(null);
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.topServices).toEqual([]);
  });

  it('Sunday: week starts today (day 0)', async () => {
    vi.setSystemTime(new Date(2026, 6, 12, 10, 0, 0)); // Sunday July 12
    mockGetBookings.mockResolvedValue({
      data: [
        makeBooking({ booking_date: '2026-07-12', status: 'completed', total_price: 90 }), // Sun
        makeBooking({ id: 'b2', booking_date: '2026-07-11', status: 'completed', total_price: 40 }), // Sat
      ],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    // Sunday: startOfWeek is today July 12, so Jul 12 counts, Jul 11 does not
    expect(result.current.stats.lucroSemana).toBe(90);
    expect(result.current.stats.concluidosSemana).toBe(1);
  });

  it('Saturday after 20:00: week jumps to next Sunday', async () => {
    vi.setSystemTime(new Date(2026, 6, 18, 21, 0, 0)); // Sat July 18 at 21:00
    mockGetBookings.mockResolvedValue({
      data: [
        makeBooking({ booking_date: '2026-07-18', status: 'completed', total_price: 70 }), // Sat
        makeBooking({ id: 'b2', booking_date: '2026-07-19', status: 'completed', total_price: 50 }), // Sun
      ],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    // Saturday after 20:00 → startOfWeek = July 19 (next Sunday)
    // Jul 18 < Jul 19, so NOT in week. Jul 19 >= Jul 19, so IS in week.
    expect(result.current.stats.lucroSemana).toBe(50);
    expect(result.current.stats.concluidosSemana).toBe(1);
  });

  it('Saturday before 20:00: week goes back to previous Sunday', async () => {
    vi.setSystemTime(new Date(2026, 6, 18, 19, 0, 0)); // Sat July 18 at 19:00
    mockGetBookings.mockResolvedValue({
      data: [
        makeBooking({ booking_date: '2026-07-12', status: 'completed', total_price: 30 }), // prev Sun
        makeBooking({ id: 'b2', booking_date: '2026-07-11', status: 'completed', total_price: 20 }), // Sat before
      ],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    // Sat before 20:00 → startOfWeek = July 12 (previous Sunday)
    // Jul 12 >= Jul 12, Jul 11 < Jul 12
    expect(result.current.stats.lucroSemana).toBe(30);
  });

  it('handles service_ids with null entries', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ status: 'completed', service_ids: ['s1', null as unknown as string] })],
      error: null,
    });
    mockGetServices.mockResolvedValue(mockServices);
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.topServices.find((s) => s.name === 'Corte')?.count).toBe(1);
  });

  it('total_price defaults to 0 when falsy', async () => {
    mockGetBookings.mockResolvedValue({
      data: [makeBooking({ status: 'completed', total_price: 0 })],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.lucroTotal).toBe(0);
    expect(result.current.stats.lucroMes).toBe(0);
  });

  it('sets up auto-refresh interval and cleans up on unmount', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useProfileStats());
    await act(async () => {});
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('auto-refresh fires loadData on interval tick', async () => {
    renderHook(() => useProfileStats());
    await act(async () => {});
    const callCountAfterInit = mockGetBookings.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(3 * 60 * 1000); // 3 minutes
    });

    expect(mockGetBookings.mock.calls.length).toBeGreaterThan(callCountAfterInit);
  });

  it('booking outside month does not affect monthly stats', async () => {
    mockGetBookings.mockResolvedValue({
      data: [
        makeBooking({ booking_date: '2026-06-30', status: 'completed', total_price: 200 }), // prev month
        makeBooking({ id: 'b2', booking_date: '2026-07-15', status: 'completed', total_price: 50 }), // this month
      ],
      error: null,
    });
    const { result } = renderHook(() => useProfileStats());
    await act(async () => {});
    expect(result.current.stats.lucroMes).toBe(50);
    expect(result.current.stats.concluidosMes).toBe(1);
  });
});
