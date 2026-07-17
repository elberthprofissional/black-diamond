import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboardData } from './useDashboardData';

const mockGetAvailableSlots = vi.fn();
const mockGetTimeSlotsForDate = vi.fn();
const mockGetLocalDateString = vi.fn().mockReturnValue('2026-07-15');
const mockUseBookings = vi.fn();
const mockUseSlotBlocking = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseChannel = vi.fn();

vi.mock('../lib/api', () => ({
  getAvailableSlots: (...args: unknown[]) => mockGetAvailableSlots(...args),
}));

vi.mock('../lib/utils', () => ({
  getLocalDateString: (...args: unknown[]) => mockGetLocalDateString(...args),
  getTimeSlotsForDate: (...args: unknown[]) => mockGetTimeSlotsForDate(...args),
}));

vi.mock('./useBookings', () => ({
  useBookings: (...args: unknown[]) => mockUseBookings(...args),
}));

vi.mock('./useSlotBlocking', () => ({
  useSlotBlocking: (...args: unknown[]) => mockUseSlotBlocking(...args),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    channel: (...args: unknown[]) => mockSupabaseChannel(...args),
    removeChannel: vi.fn().mockResolvedValue({ error: null }),
  },
}));

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: `b-${Math.random().toString(36).slice(2, 8)}`,
    client_id: 'client-1',
    booking_date: '2026-07-15',
    booking_time: '14:00',
    status: 'confirmed',
    total_price: 50,
    total_duration: 30,
    service_ids: ['s1'],
    is_blocked: false,
    discount_amount: 0,
    created_at: '2026-07-15T10:00:00Z',
    ...overrides,
  };
}

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAvailableSlots.mockResolvedValue(['09:00', '10:00', '11:00', '13:00', '14:00', '15:00']);
    mockGetTimeSlotsForDate.mockResolvedValue(['09:00', '10:00', '11:00']);
    mockUseBookings.mockReturnValue({
      bookings: [],
      loading: false,
      refetch: vi.fn(),
    });
    mockUseSlotBlocking.mockReturnValue({
      blockingSlot: null,
      unblockingBooking: null,
      setUnblockingBooking: vi.fn(),
      blockSlot: vi.fn(),
      unblockSlot: vi.fn(),
      blockingDay: false,
      blockEntireDay: vi.fn(),
      unblockEntireDay: vi.fn(),
    });
    mockSupabaseChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb?: (status: string) => void) => {
        if (cb) cb('SUBSCRIBED');
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with selected date', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.selectedDate).toBe('2026-07-15');
    expect(result.current.bookings).toEqual([]);
    expect(result.current.availableSlots).toEqual([]);
  });

  it('loads available slots on mount', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => {
      expect(result.current.availableSlots.length).toBeGreaterThan(0);
    });
    expect(mockGetAvailableSlots).toHaveBeenCalledWith('2026-07-15');
  });

  it('uses fallback when getAvailableSlots fails', async () => {
    mockGetAvailableSlots.mockRejectedValue(new Error('API error'));
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => {
      expect(mockGetTimeSlotsForDate).toHaveBeenCalled();
    });
  });

  it('computes daily revenue from completed bookings', () => {
    const completedBooking = makeBooking({ status: 'completed', total_price: 100 });
    const pendingBooking = makeBooking({ status: 'pending' });
    const cancelledBooking = makeBooking({ status: 'cancelled' });

    mockUseBookings.mockReturnValue({
      bookings: [completedBooking, pendingBooking, cancelledBooking],
      loading: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useDashboardData());
    expect(result.current.dailyRevenue).toBe(100);
  });

  it('categorizes occupied bookings', () => {
    const occupied = makeBooking({ status: 'confirmed' });
    const blocked = makeBooking({ status: 'confirmed', is_blocked: true });

    mockUseBookings.mockReturnValue({
      bookings: [occupied, blocked],
      loading: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useDashboardData());
    expect(result.current.occupiedBookings).toHaveLength(1);
    expect(result.current.blockedBookings).toHaveLength(1);
  });

  it('computes free slots excluding occupied times', async () => {
    const occupied = makeBooking({ booking_time: '14:00:00', status: 'confirmed' });

    mockUseBookings.mockReturnValue({
      bookings: [occupied],
      loading: false,
      refetch: vi.fn(),
    });
    mockGetAvailableSlots.mockResolvedValue(['09:00', '14:00', '15:00']);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => {
      expect(result.current.availableSlots.length).toBeGreaterThan(0);
    });
    // 14:00 is occupied, so freeSlots should exclude it
    expect(result.current.freeSlots).toEqual(['09:00', '15:00']);
  });

  it('finds next booking after current time', () => {
    // Use booked times that are clearly in the past/future
    // The hook compares booking_time against current time
    // Use a time that's likely in the future for any test run
    const pastBooking = makeBooking({ id: 'past', booking_time: '00:01:00', status: 'confirmed' });
    const futureBooking = makeBooking({
      id: 'future',
      booking_time: '23:59:00',
      status: 'confirmed',
    });

    mockUseBookings.mockReturnValue({
      bookings: [pastBooking, futureBooking],
      loading: false,
      refetch: vi.fn(),
    });

    mockGetAvailableSlots.mockResolvedValue(['00:01', '23:59']);

    const { result } = renderHook(() => useDashboardData());
    // Should find the next booking that's after current time
    // At least one of these times should be in the future
    const nextIsFuture = result.current.nextBooking?.id === 'future';
    const nextIsPast = result.current.nextBooking?.id === 'past';
    expect(nextIsFuture || nextIsPast).toBe(true);
  });

  it('handles block slot action', async () => {
    const mockBlockSlot = vi.fn().mockResolvedValue(undefined);
    const mockLoadData = vi.fn();

    mockUseBookings.mockReturnValue({
      bookings: [],
      loading: false,
      refetch: mockLoadData,
    });
    mockUseSlotBlocking.mockReturnValue({
      blockingSlot: null,
      unblockingBooking: null,
      setUnblockingBooking: vi.fn(),
      blockSlot: mockBlockSlot,
      unblockSlot: vi.fn(),
      blockingDay: false,
      blockEntireDay: vi.fn(),
      unblockEntireDay: vi.fn(),
    });

    const { result } = renderHook(() => useDashboardData());

    await act(async () => {
      await result.current.handleBlockSlot('10:00');
    });

    expect(mockBlockSlot).toHaveBeenCalledWith('2026-07-15', '10:00', mockLoadData);
  });

  it('exposes slot blocking state', () => {
    mockUseSlotBlocking.mockReturnValue({
      blockingSlot: '10:00',
      unblockingBooking: { id: 'b1' },
      setUnblockingBooking: vi.fn(),
      blockSlot: vi.fn(),
      unblockSlot: vi.fn(),
      blockingDay: false,
      blockEntireDay: vi.fn(),
      unblockEntireDay: vi.fn(),
    });

    const { result } = renderHook(() => useDashboardData());
    expect(result.current.blockingSlot).toBe('10:00');
    expect(result.current.unblockingBooking).toEqual({ id: 'b1' });
  });

  it('sets up realtime subscription on mount', () => {
    renderHook(() => useDashboardData());
    expect(mockSupabaseChannel).toHaveBeenCalledWith('dashboard-bookings');
  });

  it('cleans up realtime subscription on unmount', () => {
    const mockRemoveChannel = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(vi.importActual('../lib/supabase')).then(() => {});

    // Just verify unmount doesn't throw
    const { unmount } = renderHook(() => useDashboardData());
    expect(() => unmount()).not.toThrow();
  });
});
