import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBookingStatusCounts } from './useBookingStatusCounts';
import type { BookingWithClient } from '../types';

describe('useBookingStatusCounts', () => {
  it('conta bookings completed, cancelled e no_show corretamente', () => {
    const bookings = [
      { id: '1', status: 'completed', no_show: false },
      { id: '2', status: 'completed', no_show: false },
      { id: '3', status: 'cancelled', no_show: false },
      { id: '4', status: 'confirmed', no_show: true },
      { id: '5', status: 'confirmed', no_show: true },
    ] as BookingWithClient[];

    const { result } = renderHook(() => useBookingStatusCounts(bookings));

    expect(result.current.completedCount).toBe(2);
    expect(result.current.cancelledCount).toBe(1);
    expect(result.current.noShowCount).toBe(2);
  });

  it('retorna zero para array vazio', () => {
    const { result } = renderHook(() => useBookingStatusCounts([]));

    expect(result.current.completedCount).toBe(0);
    expect(result.current.cancelledCount).toBe(0);
    expect(result.current.noShowCount).toBe(0);
  });

  it('retorna zero quando nenhum booking corresponde', () => {
    const bookings = [
      { id: '1', status: 'pending', no_show: false },
      { id: '2', status: 'confirmed', no_show: false },
    ] as BookingWithClient[];

    const { result } = renderHook(() => useBookingStatusCounts(bookings));

    expect(result.current.completedCount).toBe(0);
    expect(result.current.cancelledCount).toBe(0);
    expect(result.current.noShowCount).toBe(0);
  });

  it('conta no_show mesmo quando status é cancelled', () => {
    const bookings = [{ id: '1', status: 'cancelled', no_show: true }] as BookingWithClient[];

    const { result } = renderHook(() => useBookingStatusCounts(bookings));

    // cancelled conta como cancelled, no_show conta separadamente
    expect(result.current.cancelledCount).toBe(1);
    expect(result.current.noShowCount).toBe(1);
    expect(result.current.completedCount).toBe(0);
  });

  it('recalcula quando bookings muda', () => {
    const { result, rerender } = renderHook(({ bookings }) => useBookingStatusCounts(bookings), {
      initialProps: {
        bookings: [{ id: '1', status: 'completed', no_show: false }] as BookingWithClient[],
      },
    });

    expect(result.current.completedCount).toBe(1);

    rerender({
      bookings: [
        { id: '1', status: 'completed', no_show: false },
        { id: '2', status: 'cancelled', no_show: false },
      ] as BookingWithClient[],
    });

    expect(result.current.completedCount).toBe(1);
    expect(result.current.cancelledCount).toBe(1);
  });
});
