import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBookings } from './useBookings';

const mockGetBookings = vi.fn();
const mockAutoComplete = vi.fn();

vi.mock('../lib/api', () => ({
  getBookings: (...args: unknown[]) => mockGetBookings(...args),
  autoCompleteExpiredBookings: (...args: unknown[]) => mockAutoComplete(...args),
}));

describe('useBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAutoComplete.mockResolvedValue(0);
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
  });

  it('chama getBookings com a data correta', async () => {
    mockGetBookings.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 200 });

    renderHook(() => useBookings('2026-07-05'));

    await waitFor(() => {
      expect(mockGetBookings).toHaveBeenCalledWith('2026-07-05');
    });
  });

  it('trata erro na busca', async () => {
    mockGetBookings.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBookings('2026-07-05'));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.error?.message).toBe('Network error');
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

  it('chama autoCompleteExpiredBookings para data fornecida', async () => {
    mockGetBookings.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 200 });

    renderHook(() => useBookings('2026-07-05'));

    await waitFor(() => {
      expect(mockAutoComplete).toHaveBeenCalledWith('2026-07-05');
    });
  });

  it('não chama autoComplete sem data', async () => {
    mockGetBookings.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 200 });

    renderHook(() => useBookings());

    await waitFor(() => {
      expect(mockGetBookings).toHaveBeenCalled();
    });

    expect(mockAutoComplete).not.toHaveBeenCalled();
  });

  it('refetch após auto-complete quando há bookings atualizados', async () => {
    mockGetBookings
      .mockResolvedValueOnce({
        data: [{ id: 'b1', status: 'confirmed' }],
        total: 1,
        page: 1,
        pageSize: 200,
      })
      .mockResolvedValueOnce({
        data: [{ id: 'b1', status: 'completed' }],
        total: 1,
        page: 1,
        pageSize: 200,
      });
    mockAutoComplete.mockResolvedValue(1);

    renderHook(() => useBookings('2026-07-05'));

    await waitFor(() => {
      expect(mockAutoComplete).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockGetBookings).toHaveBeenCalledTimes(2);
    });
  });
});
