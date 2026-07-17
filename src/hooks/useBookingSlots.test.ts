import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookingSlots } from './useBookingSlots';

const mockGetAvailableSlots = vi.fn();
const mockGetBookings = vi.fn();

vi.mock('../lib/api', () => ({
  getAvailableSlots: (...args: unknown[]) => mockGetAvailableSlots(...args),
  getBookings: (...args: unknown[]) => mockGetBookings(...args),
}));

describe('useBookingSlots', () => {
  const showError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAvailableSlots.mockResolvedValue(['09:00', '10:00', '11:00']);
    mockGetBookings.mockResolvedValue({ data: [] });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useBookingSlots(showError));

    expect(result.current.selectedDate).toBe('');
    expect(result.current.selectedTime).toBe('');
    expect(result.current.availableSlots).toEqual([]);
    expect(result.current.existingBookings).toEqual([]);
  });

  it('sets selected date and loads data', async () => {
    const { result } = renderHook(() => useBookingSlots(showError));

    await act(async () => {
      result.current.setSelectedDate('2026-07-20');
    });

    expect(result.current.selectedDate).toBe('2026-07-20');
  });

  it('sets selected time', () => {
    const { result } = renderHook(() => useBookingSlots(showError));

    act(() => {
      result.current.setSelectedTime('10:00');
    });

    expect(result.current.selectedTime).toBe('10:00');
  });

  it('clears selected time when date changes', async () => {
    const { result } = renderHook(() => useBookingSlots(showError));

    act(() => {
      result.current.setSelectedTime('10:00');
    });

    await act(async () => {
      result.current.setSelectedDate('2026-07-20');
    });

    expect(result.current.selectedTime).toBe('');
  });

  it('returns next days array', () => {
    const { result } = renderHook(() => useBookingSlots(showError));

    expect(Array.isArray(result.current.nextDays)).toBe(true);
    expect(result.current.nextDays.length).toBeGreaterThan(0);
  });

  it('returns drag scroll handlers', () => {
    const { result } = renderHook(() => useBookingSlots(showError));

    expect(typeof result.current.handleMouseDown).toBe('function');
    expect(typeof result.current.handleMouseLeave).toBe('function');
    expect(typeof result.current.handleMouseUp).toBe('function');
    expect(typeof result.current.handleMouseMove).toBe('function');
    expect(result.current.dateContainerRef).toBeDefined();
  });
});
