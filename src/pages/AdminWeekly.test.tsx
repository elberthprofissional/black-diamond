import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../components/Admin/AuthGuard', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../lib/api', () => ({
  getBookings: vi.fn().mockResolvedValue([]),
  getAvailableSlots: vi.fn().mockResolvedValue(['08:00', '09:00']),
  getServices: vi.fn().mockResolvedValue([{ id: 's1', name: 'Corte', price: 35, duration: 40 }]),
  updateBookingStatus: vi.fn().mockResolvedValue(undefined),
  deleteBooking: vi.fn().mockResolvedValue(undefined),
  toggleSlotBlock: vi.fn().mockResolvedValue({ id: 'b1', blocked: true }),
  unblockDay: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/supabase', () => {
  const makeThenable = (data: unknown) => ({
    then: (onFulfilled: (v: unknown) => void) => Promise.resolve(data).then(onFulfilled),
  });

  const makeBuilder = () => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    return Object.assign(builder, makeThenable({ data: [], error: null }));
  };

  return {
    supabase: {
      from: vi.fn(() => makeBuilder()),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      auth: {
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: { user: { id: '1' } } }, error: null }),
        onAuthStateChange: vi
          .fn()
          .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn().mockResolvedValue({ error: null }),
    },
  };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/admin/weekly', search: '' }),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toast: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../hooks/useBarberSettings', () => ({
  useBarberSettings: () => ({
    barberName: 'Admin',
    barberPhone: '5531999999999',
    barberPhoto: '',
    barberBio: '',
    barberQuote: '',
    barberInstagram: '',
    barberHours: JSON.stringify({
      '1': { enabled: true, open: '09:00', close: '18:00' },
      '2': { enabled: true, open: '09:00', close: '18:00' },
      '3': { enabled: true, open: '09:00', close: '18:00' },
      '4': { enabled: true, open: '09:00', close: '18:00' },
      '5': { enabled: true, open: '09:00', close: '18:00' },
      '6': { enabled: true, open: '09:00', close: '17:00' },
    }),
    brandName: 'Black Diamond',
    brandColor: '#D4AF37',
    brandLogo: '',
    brandLoginBg: '',
    loading: false,
  }),
}));

vi.mock('../hooks/useBookingModals', () => ({
  useBookingModals: () => ({
    selectedBooking: null,
    setSelectedBooking: vi.fn(),
    isRescheduling: false,
    rescheduleStep: 1,
    setRescheduleStep: vi.fn(),
    rescheduleServices: [],
    setRescheduleServices: vi.fn(),
    rescheduleDate: '',
    setRescheduleDate: vi.fn(),
    rescheduleTime: '',
    setRescheduleTime: vi.fn(),
    existingBookingsForReschedule: [],
    loadingSlots: false,
    isSavingReschedule: false,
    handleConfirmReschedule: vi.fn(),
    handleStartReschedule: vi.fn(),
    cancelReschedule: vi.fn(),
    completingBooking: null,
    setCompletingBooking: vi.fn(),
    handleComplete: vi.fn(),
    thankYouBooking: null,
    handleSendThankYou: vi.fn(),
    handleCancelThankYou: vi.fn(),
    bookingToDelete: null,
    setBookingToDelete: vi.fn(),
    confirmDelete: vi.fn(),
    toast: null,
  }),
}));

vi.mock('framer-motion', () => {
  const FM = new Set([
    'whileHover',
    'whileTap',
    'whileFocus',
    'whileDrag',
    'whileInView',
    'layoutId',
    'layout',
    'animate',
    'initial',
    'exit',
    'transition',
    'variants',
    'onAnimationStart',
    'onAnimationComplete',
  ]);
  const M =
    (tag: string) =>
    ({ children, ...p }: Record<string, unknown>) =>
      createElement(
        tag,
        Object.fromEntries(Object.entries(p).filter(([k]) => !FM.has(k))),
        children
      );
  return {
    motion: { div: M('div'), button: M('button'), span: M('span') },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('../lib/api/barbers', () => ({
  getBarbers: vi.fn().mockResolvedValue([]),
  getBarberByUserId: vi.fn().mockResolvedValue(null),
}));

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({
    status: null,
    loading: false,
    error: null,
    payments: [],
    generatingPayment: false,
    paymentResult: null,
    paymentError: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    generatePayment: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BarberProvider } from '../contexts/BarberContext';
import AdminWeekly from './AdminWeekly';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BarberProvider>{children}</BarberProvider>
    </QueryClientProvider>
  );
}

describe('AdminWeekly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sem erros', () => {
    const { container } = render(
      <Wrapper>
        <AdminWeekly />
      </Wrapper>
    );
    expect(container).toBeTruthy();
  });

  it('renderiza titulo da agenda semanal', async () => {
    render(
      <Wrapper>
        <AdminWeekly />
      </Wrapper>
    );
    await waitFor(() => {
      expect(screen.getByText(/Agenda da Semana/i)).toBeInTheDocument();
    });
  });

  it('renderiza navegacao por dia da semana', async () => {
    render(
      <Wrapper>
        <AdminWeekly />
      </Wrapper>
    );
    await waitFor(() => {
      const dayButtons = screen.getAllByRole('button');
      expect(dayButtons.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('renderiza abas de filtro', async () => {
    render(
      <Wrapper>
        <AdminWeekly />
      </Wrapper>
    );
    await waitFor(() => {
      expect(screen.getByText(/Ocupados/i)).toBeInTheDocument();
    });
  });

  it('renderiza aba livres', async () => {
    render(
      <Wrapper>
        <AdminWeekly />
      </Wrapper>
    );
    await waitFor(() => {
      expect(screen.getByText(/Livres/i)).toBeInTheDocument();
    });
  });
});
