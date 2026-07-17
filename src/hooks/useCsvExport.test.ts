import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCsvExport } from './useCsvExport';

const mockGetBookings = vi.fn();
const mockGetClients = vi.fn();
const mockGetServices = vi.fn();
const mockGetBookingsForStats = vi.fn();
const mockShowError = vi.fn();

vi.mock('../lib/api', () => ({
  getBookings: (...args: unknown[]) => mockGetBookings(...args),
  getClients: (...args: unknown[]) => mockGetClients(...args),
  getServices: (...args: unknown[]) => mockGetServices(...args),
  getBookingsForStats: (...args: unknown[]) => mockGetBookingsForStats(...args),
}));

vi.mock('../lib/csv', () => ({
  generateCsv: vi.fn().mockReturnValue('csv-content'),
  downloadCsv: vi.fn(),
  formatDateRange: vi.fn().mockReturnValue('20260101-20260731'),
}));

describe('useCsvExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServices.mockResolvedValue([
      { id: 's1', name: 'Corte' },
      { id: 's2', name: 'Barba' },
    ]);
  });

  it('initializes with isExporting false', () => {
    const { result } = renderHook(() => useCsvExport(mockShowError));
    expect(result.current.isExporting).toBe(false);
  });

  it('exports bookings successfully', async () => {
    mockGetBookings.mockResolvedValue({
      data: [
        {
          id: 'b1',
          booking_date: '2026-07-15',
          booking_time: '14:00:00',
          clients: { name: 'Joao', phone: '31999998888' },
          service_ids: ['s1'],
          total_duration: 30,
          total_price: 50,
          discount_amount: 0,
          status: 'confirmed',
        },
      ],
    });

    const { result } = renderHook(() => useCsvExport(mockShowError));
    await act(async () => {
      await result.current.exportBookings();
    });
    expect(result.current.isExporting).toBe(false);
    expect(mockGetBookings).toHaveBeenCalled();
    expect(mockGetServices).toHaveBeenCalled();
  });

  it('exports bookings with date filter', async () => {
    mockGetBookings.mockResolvedValue({
      data: [
        {
          id: 'b1',
          booking_date: '2026-07-15',
          booking_time: '14:00:00',
          clients: { name: 'Joao', phone: '31999998888' },
          service_ids: ['s1'],
          total_duration: 30,
          total_price: 50,
          discount_amount: 0,
          status: 'confirmed',
        },
      ],
    });

    const { result } = renderHook(() => useCsvExport(mockShowError));
    await act(async () => {
      await result.current.exportBookings('2026-01-01', '2026-07-31');
    });
    expect(result.current.isExporting).toBe(false);
  });

  it('exports clients successfully', async () => {
    mockGetClients.mockResolvedValue([
      {
        id: 'c1',
        name: 'Joao Silva',
        phone: '31999998888',
        historical_visits: 10,
        last_visit_date: '2026-07-10',
        historical_spent: 500,
        is_mensalista: false,
        is_favorite: true,
      },
    ]);

    const { result } = renderHook(() => useCsvExport(mockShowError));
    await act(async () => {
      await result.current.exportClients();
    });
    expect(result.current.isExporting).toBe(false);
    expect(mockGetClients).toHaveBeenCalled();
  });

  it('exports financial report successfully', async () => {
    mockGetBookingsForStats.mockResolvedValue([
      { booking_date: '2026-07-15', total_price: 100, status: 'completed' },
      { booking_date: '2026-07-16', total_price: 50, status: 'completed' },
      { booking_date: '2026-07-17', total_price: 0, status: 'cancelled' },
    ]);

    const { result } = renderHook(() => useCsvExport(mockShowError));
    await act(async () => {
      await result.current.exportFinancial();
    });
    expect(result.current.isExporting).toBe(false);
    expect(mockGetBookingsForStats).toHaveBeenCalledWith(12);
  });

  it('handles API errors gracefully', async () => {
    mockGetBookings.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCsvExport(mockShowError));
    await act(async () => {
      await result.current.exportBookings();
    });
    expect(result.current.isExporting).toBe(false);
    expect(mockShowError).toHaveBeenCalled();
  });

  it('handles empty bookings list', async () => {
    mockGetBookings.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useCsvExport(mockShowError));
    await act(async () => {
      await result.current.exportBookings();
    });
    expect(result.current.isExporting).toBe(false);
  });
});
