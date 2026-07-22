import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBookings } from './useBookings';

const mockGetBookings = vi.fn();

vi.mock('../lib/api', () => ({
  getBookings: (...args: unknown[]) => mockGetBookings(...args),
}));

describe('useBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetBookings.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 200 });
  });

  it('carrega agendamentos na montagem', async () => {
    mockGetBookings.mockResolvedValue({
      data: [{ id: 'b1', status: 'confirmed', booking_time: '10:00:00' }],
      total: 1,
      page: 1,
      pageSize: 200,
    });

    const { result } = renderHook(() => useBookings('2026-07-05'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bookings).toHaveLength(1);
    expect(result.current.bookings[0].id).toBe('b1');
    expect(result.current.isCached).toBe(false);
  });

  it('chama getBookings com a data correta', async () => {
    renderHook(() => useBookings('2026-07-05'));

    await waitFor(() => {
      expect(mockGetBookings).toHaveBeenCalledWith('2026-07-05', expect.objectContaining({}));
    });
  });

  it('trata erro na busca sem cache', async () => {
    // Sem cache no localStorage
    mockGetBookings.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBookings('2026-07-05'));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.isCached).toBe(false);
  });

  it('refetch recarrega os dados', async () => {
    mockGetBookings.mockResolvedValueOnce({
      data: [{ id: 'b1', status: 'confirmed' }],
      total: 1,
      page: 1,
      pageSize: 200,
    });

    const { result } = renderHook(() => useBookings('2026-07-05'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetBookings.mockResolvedValueOnce({
      data: [
        { id: 'b1', status: 'confirmed' },
        { id: 'b2', status: 'pending' },
      ],
      total: 2,
      page: 1,
      pageSize: 200,
    });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.bookings).toHaveLength(2);
    });
  });

  it('não chama autoComplete sem data', async () => {
    renderHook(() => useBookings());

    await waitFor(() => {
      expect(mockGetBookings).toHaveBeenCalled();
    });
  });
});
