import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminBookingSubmit } from './useAdminBookingSubmit';
import type { Service } from '../types';

const mockNavigate = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockLogBooking = vi.fn();
const mockCreateBooking = vi.fn();
const mockDeleteBooking = vi.fn();
const mockOpenWhatsApp = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../lib/api', () => ({
  createBooking: (...args: unknown[]) => mockCreateBooking(...args),
  deleteBooking: (...args: unknown[]) => mockDeleteBooking(...args),
}));

vi.mock('../lib/whatsapp', () => ({
  openWhatsApp: (...args: unknown[]) => mockOpenWhatsApp(...args),
  formatWaDate: vi.fn().mockReturnValue('20/07/2026'),
  formatWaCurrency: vi.fn().mockReturnValue('R$ 50,00'),
}));

vi.mock('./useAuditLog', () => ({
  useAuditLog: () => ({ logBooking: mockLogBooking }),
}));

vi.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

const selectedServices: Service[] = [
  { id: 's1', name: 'Corte de Cabelo', price: 50, duration: 30 },
];

// Using a future date (current date is July 17, 2026)
const FUTURE_DATE = '2026-07-20';

const baseParams = {
  selectedClient: { name: 'Joao Silva', phone: '31999998888' },
  newClient: { name: '', phone: '' },
  selectedServices,
  selectedDate: FUTURE_DATE,
  selectedTime: '14:00',
  totalPrice: 50,
  totalDuration: 30,
  rescheduleBooking: null,
  barberPhone: '55319800112233',
};

describe('useAdminBookingSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateBooking.mockResolvedValue([{ id: 'b1', token: 'abc123' }]);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('initializes with isSubmitting false', () => {
    const { result } = renderHook(() => useAdminBookingSubmit(baseParams));
    expect(result.current.isSubmitting).toBe(false);
  });

  it('creates booking successfully and navigates to admin', async () => {
    const { result } = renderHook(() => useAdminBookingSubmit(baseParams));
    await act(async () => {
      await result.current.handleFinish();
    });
    expect(mockCreateBooking).toHaveBeenCalled();
    expect(mockShowSuccess).toHaveBeenCalledWith('Agendamento realizado!');
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('shows error when fields are missing', async () => {
    const params = {
      ...baseParams,
      selectedClient: null,
      newClient: { name: '', phone: '' },
    };
    const { result } = renderHook(() => useAdminBookingSubmit(params));
    await act(async () => {
      await result.current.handleFinish();
    });
    expect(mockShowError).toHaveBeenCalledWith('Preencha todos os campos.');
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it('shows error when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useAdminBookingSubmit(baseParams));
    await act(async () => {
      await result.current.handleFinish();
    });
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('sem conexão'));
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it('shows error for past dates', async () => {
    const params = {
      ...baseParams,
      selectedDate: '2020-01-01',
    };
    const { result } = renderHook(() => useAdminBookingSubmit(params));
    await act(async () => {
      await result.current.handleFinish();
    });
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('data passada'));
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it('opens WhatsApp for client after booking', async () => {
    const { result } = renderHook(() => useAdminBookingSubmit(baseParams));
    await act(async () => {
      await result.current.handleFinish();
    });
    expect(mockOpenWhatsApp).toHaveBeenCalledWith(
      '31999998888',
      expect.stringContaining('Black Diamond')
    );
  });

  it('opens WhatsApp for barber after booking', async () => {
    const { result } = renderHook(() => useAdminBookingSubmit(baseParams));
    await act(async () => {
      await result.current.handleFinish();
    });
    expect(mockOpenWhatsApp).toHaveBeenCalledWith(
      '55319800112233',
      expect.stringContaining('Novo Agendamento')
    );
  });

  it('handles booking creation error', async () => {
    mockCreateBooking.mockRejectedValue(new Error('Erro no banco'));
    const { result } = renderHook(() => useAdminBookingSubmit(baseParams));
    await act(async () => {
      await result.current.handleFinish();
    });
    expect(mockShowError).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('handles reschedule by deleting old booking', async () => {
    const rescheduleBooking = {
      id: 'old-booking',
      client_id: 'c1',
      booking_date: '2026-07-19',
      booking_time: '10:00',
      status: 'confirmed',
      total_price: 50,
      total_duration: 30,
      service_ids: ['s1'],
      is_blocked: false,
      discount_amount: 0,
      created_at: '2026-07-10T10:00:00Z',
      clients: { name: 'Joao Silva', phone: '31999998888' },
    };

    const params = { ...baseParams, rescheduleBooking };
    const { result } = renderHook(() => useAdminBookingSubmit(params));
    await act(async () => {
      await result.current.handleFinish();
    });
    expect(mockDeleteBooking).toHaveBeenCalledWith('old-booking');
    expect(mockShowSuccess).toHaveBeenCalledWith('Agendamento reagendado com sucesso!');
  });

  it('uses newClient data when no selectedClient', async () => {
    const params = {
      ...baseParams,
      selectedClient: null,
      newClient: { name: 'Novo Cliente', phone: '31980159559' },
    };
    const { result } = renderHook(() => useAdminBookingSubmit(params));
    await act(async () => {
      await result.current.handleFinish();
    });
    expect(mockCreateBooking).toHaveBeenCalled();
  });

  it('logs booking creation to audit log', async () => {
    const { result } = renderHook(() => useAdminBookingSubmit(baseParams));
    await act(async () => {
      await result.current.handleFinish();
    });
    expect(mockLogBooking).toHaveBeenCalledWith(
      'booking_created',
      'b1',
      expect.objectContaining({
        client_name: 'Joao Silva',
        date: FUTURE_DATE,
      })
    );
  });
});
