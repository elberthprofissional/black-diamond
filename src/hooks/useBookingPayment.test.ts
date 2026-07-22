import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookingPayment } from './useBookingPayment';

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
  validateCoupon: vi.fn().mockResolvedValue({ valid: false }),
}));

vi.mock('./useBarberSettings', () => ({
  useBarberSettings: () => ({ barberPhone: '5511999999999' }),
}));

import { createBooking, validateCoupon } from '../lib/api';

const defaultServices = [{ id: '1', name: 'Corte', price: 35, duration: 40 }];

describe('useBookingPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('retorna null quando campos obrigatórios estão faltando', async () => {
    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingPayment(defaultServices, showError, onComplete));

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

  it('cria agendamento com sucesso', async () => {
    vi.mocked(createBooking).mockResolvedValueOnce([{ id: 'booking-1', token: 'abc123' }]);

    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingPayment(defaultServices, showError, onComplete));

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

  it('bloqueia quando rate limit ativo', async () => {
    localStorage.setItem(
      'ratelimit_booking_submit',
      JSON.stringify({ count: 3, timestamp: Date.now() })
    );

    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingPayment(defaultServices, showError, onComplete));

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

  it('trata erro do servidor corretamente', async () => {
    vi.mocked(createBooking).mockRejectedValueOnce(new Error('Horário preenchido'));

    const showError = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBookingPayment(defaultServices, showError, onComplete));

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
    const { result } = renderHook(() => useBookingPayment(defaultServices, showError, onComplete));

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
    const { result } = renderHook(() => useBookingPayment(defaultServices, showError, onComplete));

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

  it('retorna calculatedTotalPrice e finalPrice', () => {
    const showError = vi.fn();
    const onComplete = vi.fn();
    const services = [
      { id: '1', name: 'Corte', price: 35, duration: 40 },
      { id: '2', name: 'Barba', price: 27, duration: 20 },
    ];
    const { result } = renderHook(() => useBookingPayment(services, showError, onComplete));

    expect(result.current.calculatedTotalPrice).toBe(62);
    expect(result.current.finalPrice).toBe(62);
  });

  describe('coupon', () => {
    it('inicializa sem cupom', () => {
      const { result } = renderHook(() => useBookingPayment(defaultServices, vi.fn(), vi.fn()));
      expect(result.current.coupon).toBeNull();
      expect(result.current.couponLoading).toBe(false);
      expect(result.current.couponError).toBe('');
    });

    it('handleCouponValidate rejeita codigo vazio', async () => {
      const { result } = renderHook(() => useBookingPayment(defaultServices, vi.fn(), vi.fn()));
      await act(async () => {
        await result.current.handleCouponValidate('');
      });
      expect(result.current.couponError).toBe('Informe um código.');
      expect(result.current.coupon).toBeNull();
    });

    it('handleCouponValidate chama API e atualiza estado', async () => {
      vi.mocked(validateCoupon).mockResolvedValue({
        valid: true,
        coupon_id: 'c1',
        code: 'BLACK10',
        discount_type: 'percentage',
        discount_value: 10,
        discount_amount: 4,
        original_price: 35,
      });

      const { result } = renderHook(() => useBookingPayment(defaultServices, vi.fn(), vi.fn()));

      await act(async () => {
        await result.current.handleCouponValidate('black10');
      });

      expect(vi.mocked(validateCoupon)).toHaveBeenCalledWith('black10', ['1']);
      expect(result.current.coupon).toBeTruthy();
      expect(result.current.coupon!.code).toBe('BLACK10');
      expect(result.current.coupon!.discount_amount).toBe(4);
    });

    it('handleCouponValidate mostra erro quando invalido', async () => {
      vi.mocked(validateCoupon).mockResolvedValue({
        valid: false,
        error: 'Cupom expirado.',
      });

      const { result } = renderHook(() => useBookingPayment(defaultServices, vi.fn(), vi.fn()));

      await act(async () => {
        await result.current.handleCouponValidate('EXPIRED');
      });

      expect(result.current.coupon).toBeNull();
      expect(result.current.couponError).toContain('Cupom expirado');
    });

    it('handleCouponRemove limpa estado do cupom', async () => {
      vi.mocked(validateCoupon).mockResolvedValue({
        valid: true,
        coupon_id: 'c1',
        code: 'BLACK10',
        discount_type: 'fixed',
        discount_value: 10,
        discount_amount: 10,
        original_price: 35,
      });

      const { result } = renderHook(() => useBookingPayment(defaultServices, vi.fn(), vi.fn()));

      await act(async () => {
        await result.current.handleCouponValidate('BLACK10');
      });
      expect(result.current.coupon).toBeTruthy();

      act(() => {
        result.current.handleCouponRemove();
      });

      expect(result.current.coupon).toBeNull();
      expect(result.current.couponError).toBe('');
    });

    it('desconto do cupom reflete no finalPrice', async () => {
      vi.mocked(validateCoupon).mockResolvedValue({
        valid: true,
        coupon_id: 'c1',
        code: 'DESC10',
        discount_type: 'fixed',
        discount_value: 10,
        discount_amount: 10,
        original_price: 35,
      });

      const { result } = renderHook(() => useBookingPayment(defaultServices, vi.fn(), vi.fn()));

      expect(result.current.finalPrice).toBe(35);

      await act(async () => {
        await result.current.handleCouponValidate('DESC10');
      });

      expect(result.current.finalPrice).toBe(25);
    });
  });
});
