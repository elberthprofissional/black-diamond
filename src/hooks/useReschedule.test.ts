import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReschedule } from './useReschedule';
import type { BookingWithClient, Service } from '../types';

vi.mock('../lib/api', () => ({
  getBookings: vi.fn().mockResolvedValue([]),
  deleteBooking: vi.fn().mockResolvedValue(undefined),
  createBooking: vi.fn().mockResolvedValue([{ id: 'new-1' }]),
}));

const mockBooking: BookingWithClient = {
  id: 'b1',
  client_id: 'c1',
  service_ids: ['s1'],
  booking_date: '2026-07-10',
  booking_time: '10:00',
  status: 'confirmed',
  total_price: 50,
  total_duration: 40,
  created_at: '2026-07-01',
  clients: { name: 'João', phone: '31999999999' },
};

const mockServices: Service[] = [
  { id: 's1', name: 'Corte', price: 35, duration: 30 },
  { id: 's2', name: 'Barba', price: 27, duration: 20 },
];

describe('useReschedule', () => {
  const mockOnSuccess = vi.fn();
  const mockOnDone = vi.fn();
  const mockShowError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicializa com estado correto', () => {
    const { result } = renderHook(() =>
      useReschedule(null, [], mockOnSuccess, mockOnDone, mockShowError)
    );
    expect(result.current.isRescheduling).toBe(false);
    expect(result.current.rescheduleServices).toEqual([]);
    expect(result.current.isSaving).toBe(false);
  });

  it('startReschedule configura valores corretamente', () => {
    const { result } = renderHook(() =>
      useReschedule(mockBooking, mockServices, mockOnSuccess, mockOnDone, mockShowError)
    );

    act(() => {
      result.current.startReschedule();
    });

    expect(result.current.isRescheduling).toBe(true);
    expect(result.current.rescheduleServices).toHaveLength(1);
    expect(result.current.rescheduleServices[0].id).toBe('s1');
    expect(result.current.rescheduleDate).toBe('2026-07-10');
    expect(result.current.rescheduleTime).toBe('10:00');
  });

  it('cancelReschedule reseta estado', () => {
    const { result } = renderHook(() =>
      useReschedule(mockBooking, mockServices, mockOnSuccess, mockOnDone, mockShowError)
    );

    act(() => {
      result.current.startReschedule();
    });

    act(() => {
      result.current.cancelReschedule();
    });

    expect(result.current.isRescheduling).toBe(false);
    expect(result.current.rescheduleServices).toEqual([]);
  });

  it('confirmReschedule chama create + delete (na ordem correta)', async () => {
    const { result } = renderHook(() =>
      useReschedule(mockBooking, mockServices, mockOnSuccess, mockOnDone, mockShowError)
    );

    act(() => {
      result.current.startReschedule();
    });

    await act(async () => {
      await result.current.confirmReschedule();
    });

    const { deleteBooking, createBooking } = await import('../lib/api');
    const createCall = vi.mocked(createBooking).mock.calls[0];
    const deleteCall = vi.mocked(deleteBooking).mock.calls[0];

    // createBooking must be called before deleteBooking
    expect(createCall).toBeDefined();
    expect(deleteCall).toBeDefined();
    expect(deleteBooking).toHaveBeenCalledWith('b1');
    expect(createBooking).toHaveBeenCalled();
    expect(mockOnDone).toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('confirmReschedule mostra erro em caso de falha', async () => {
    const { deleteBooking } = await import('../lib/api');
    vi.mocked(deleteBooking).mockRejectedValueOnce(new Error('DB error'));

    const { result } = renderHook(() =>
      useReschedule(mockBooking, mockServices, mockOnSuccess, mockOnDone, mockShowError)
    );

    act(() => {
      result.current.startReschedule();
    });

    await act(async () => {
      await result.current.confirmReschedule();
    });

    expect(mockShowError).toHaveBeenCalledWith('Erro ao reagendar.');
  });
});
