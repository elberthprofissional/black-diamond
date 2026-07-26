import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../components/Admin/AuthGuard', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../lib/api', () => ({
  getServices: vi.fn().mockResolvedValue([
    { id: 's1', name: 'Corte', price: 35, duration: 30 },
    { id: 's2', name: 'Barba', price: 27, duration: 20 },
  ]),
  getBookings: vi.fn().mockResolvedValue([]),
  getBookingsForStats: vi.fn().mockResolvedValue([]),
  getClients: vi.fn().mockResolvedValue([]),
  createBooking: vi.fn().mockResolvedValue([{ id: 'b1' }]),
  deleteBooking: vi.fn().mockResolvedValue(undefined),
  getMensalistaPlans: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/supabase', () => {
  const makeBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (onFulfilled: (v: unknown) => void, onRejected: (v: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected),
    };
    return builder;
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
    },
  };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/admin/agendar', search: '', state: null }),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
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
    motion: { div: M('div'), button: M('button') },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('../hooks/useIsDesktop', () => ({
  useIsDesktop: () => true,
}));

vi.mock('../hooks/useMensalistaFilter', () => ({
  useMensalistaFilter: vi.fn(({ allServices }) => ({
    filteredServices: allServices,
    filterDaysForMensalista: (days: unknown[]) => days,
  })),
}));

vi.mock('../lib/api/barbers', () => ({
  getBarbers: vi.fn().mockResolvedValue([]),
  getBarberByUserId: vi.fn().mockResolvedValue(null),
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

import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import { BarberProvider } from '../contexts/BarberContext';
import AdminBooking from './AdminBooking';

describe('AdminBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza titulo do agendamento', async () => {
    render(
      <BarberSettingsProvider>
        <BarberProvider>
          <AdminBooking />
        </BarberProvider>
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Novo Agendamento/i).length).toBeGreaterThan(0);
    });
  });

  it('renderiza secao de cliente', async () => {
    render(
      <BarberSettingsProvider>
        <BarberProvider>
          <AdminBooking />
        </BarberProvider>
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/CLIENTE/i).length).toBeGreaterThan(0);
    });
  });

  it('renderiza campo de nome', async () => {
    render(
      <BarberSettingsProvider>
        <BarberProvider>
          <AdminBooking />
        </BarberProvider>
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/nome/i)).toBeInTheDocument();
    });
  });

  it('renderiza campo de telefone', async () => {
    render(
      <BarberSettingsProvider>
        <BarberProvider>
          <AdminBooking />
        </BarberProvider>
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/00000/i)).toBeInTheDocument();
    });
  });

  it('renderiza secao de servicos', async () => {
    render(
      <BarberSettingsProvider>
        <BarberProvider>
          <AdminBooking />
        </BarberProvider>
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/SERVIÇOS/i).length).toBeGreaterThan(0);
    });
  });

  it('renderiza secao de agenda', async () => {
    render(
      <BarberSettingsProvider>
        <BarberProvider>
          <AdminBooking />
        </BarberProvider>
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/AGENDA/i).length).toBeGreaterThan(0);
    });
  });

  it('renderiza botao de buscar cliente', async () => {
    render(
      <BarberSettingsProvider>
        <BarberProvider>
          <AdminBooking />
        </BarberProvider>
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Buscar|Dados|Cliente/i).length).toBeGreaterThan(0);
    });
  });

  it('renderiza botao de avancar', async () => {
    render(
      <BarberSettingsProvider>
        <BarberProvider>
          <AdminBooking />
        </BarberProvider>
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Continuar/i).length).toBeGreaterThan(0);
    });
  });
});
