import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookingSubmit } from './useBookingSubmit';

const mockRpc = vi.fn();
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  then: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('../lib/api', () => ({
  createBooking: vi.fn(),
}));

vi.mock('./useBarberSettings', () => ({
  useBarberSettings: () => ({ barberPhone: '5511999999999' }),
}));

vi.mock('./useToast', () => ({
  useToast: () => ({
    toast: null,
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

import { createBooking } from '../lib/api';

describe('useBookingSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('retorna null quando campos obrigatórios estão faltando', async () => {
    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingSubmit(showError, onComplete));

    const response = await result.current.handleConfirm({
      selectedServices: [],
      selectedDate: '2026-07-15',
      selectedTime: '10:00',
      userInfo: { name: 'Test', phone: '11999887766' },
      totalPrice: 35,
      isMensalista: false,
    });

    expect(response).toBeNull();
    expect(showError).not.toHaveBeenCalled();
  });

  it('salva na fila offline e retorna sucesso', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingSubmit(showError, onComplete));

    const response = await result.current.handleConfirm({
      selectedServices: [{ id: '1', name: 'Corte', price: 35, duration: 40 }],
      selectedDate: '2026-07-15',
      selectedTime: '10:00',
      userInfo: { name: 'Test', phone: '11999887766' },
      totalPrice: 35,
      isMensalista: false,
    });

    expect(response).toEqual({ token: '', manageUrl: '' });
    expect(onComplete).toHaveBeenCalled();
  });

  it('bloqueia quando rate limit ativo', async () => {
    // Pre-populate rate limit
    localStorage.setItem(
      'ratelimit_booking_submit',
      JSON.stringify({ count: 3, timestamp: Date.now() })
    );

    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingSubmit(showError, onComplete));

    const response = await result.current.handleConfirm({
      selectedServices: [{ id: '1', name: 'Corte', price: 35, duration: 40 }],
      selectedDate: '2026-07-15',
      selectedTime: '10:00',
      userInfo: { name: 'Test', phone: '11999887766' },
      totalPrice: 35,
      isMensalista: false,
    });

    expect(response).toBeNull();
    expect(showError).toHaveBeenCalledWith(expect.stringContaining('Muitas tentativas'));
  });

  it('cria agendamento com sucesso', async () => {
    vi.mocked(createBooking).mockResolvedValueOnce([{ id: 'booking-1', token: 'abc123' }]);

    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingSubmit(showError, onComplete));

    let response: { token: string; manageUrl: string } | null = null;
    await act(async () => {
      response = await result.current.handleConfirm({
        selectedServices: [{ id: '1', name: 'Corte', price: 35, duration: 40 }],
        selectedDate: '2026-07-15',
        selectedTime: '10:00',
        userInfo: { name: 'João', phone: '11999887766' },
        totalPrice: 35,
        isMensalista: false,
      });
    });

    expect(response).toBeTruthy();
    expect(response!.token).toBe('abc123');
    expect(response!.manageUrl).toContain('/gerenciar?token=abc123');
    expect(onComplete).toHaveBeenCalled();
    expect(showError).not.toHaveBeenCalled();
  });

  it('trata erro do servidor corretamente', async () => {
    vi.mocked(createBooking).mockRejectedValueOnce(new Error('Horário preenchido'));

    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingSubmit(showError, onComplete));

    await act(async () => {
      await result.current.handleConfirm({
        selectedServices: [{ id: '1', name: 'Corte', price: 35, duration: 40 }],
        selectedDate: '2026-07-15',
        selectedTime: '10:00',
        userInfo: { name: 'João', phone: '11999887766' },
        totalPrice: 35,
        isMensalista: false,
      });
    });

    expect(showError).toHaveBeenCalledWith(expect.stringContaining('preenchido'));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('previne duplo submit', async () => {
    vi.mocked(createBooking).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([{ id: '1', token: 'abc' }]), 1000))
    );

    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingSubmit(showError, onComplete));

    // First submit
    act(() => {
      result.current.handleConfirm({
        selectedServices: [{ id: '1', name: 'Corte', price: 35, duration: 40 }],
        selectedDate: '2026-07-15',
        selectedTime: '10:00',
        userInfo: { name: 'João', phone: '11999887766' },
        totalPrice: 35,
        isMensalista: false,
      });
    });

    // Second submit while first is in progress
    const secondResponse = await result.current.handleConfirm({
      selectedServices: [{ id: '1', name: 'Corte', price: 35, duration: 40 }],
      selectedDate: '2026-07-15',
      selectedTime: '10:00',
      userInfo: { name: 'João', phone: '11999887766' },
      totalPrice: 35,
      isMensalista: false,
    });

    expect(secondResponse).toBeNull();
  });

  it('isSubmitting retorna true durante submissão', async () => {
    let resolveBooking: (v: unknown) => void;
    vi.mocked(createBooking).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBooking = resolve;
        })
    );

    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingSubmit(showError, onComplete));

    expect(result.current.isSubmitting).toBe(false);

    act(() => {
      result.current.handleConfirm({
        selectedServices: [{ id: '1', name: 'Corte', price: 35, duration: 40 }],
        selectedDate: '2026-07-15',
        selectedTime: '10:00',
        userInfo: { name: 'João', phone: '11999887766' },
        totalPrice: 35,
        isMensalista: false,
      });
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveBooking!([{ id: '1', token: 'abc' }]);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});
