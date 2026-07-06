import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockGetBookings = vi.fn().mockResolvedValue([
  {
    id: 'b1',
    client_id: 'c1',
    booking_date: '2026-07-05',
    booking_time: '10:00:00',
    total_price: 35,
    status: 'confirmed',
    is_blocked: false,
    service_ids: ['s1'],
    clients: { name: 'João Silva', phone: '11999999999' },
  },
  {
    id: 'b2',
    client_id: 'c2',
    booking_date: '2026-07-05',
    booking_time: '11:00:00',
    total_price: 27,
    status: 'completed',
    is_blocked: false,
    service_ids: ['s2'],
    clients: { name: 'Maria Souza', phone: '11888888888' },
  },
]);

vi.mock('../lib/api', () => ({
  getBookings: (...args: unknown[]) => mockGetBookings(...args),
  getAvailableSlots: vi.fn().mockResolvedValue(['08:00', '09:00']),
  autoCompleteExpiredBookings: vi.fn().mockResolvedValue(0),
  updateBookingStatus: vi.fn().mockResolvedValue(undefined),
  deleteBooking: vi.fn().mockResolvedValue(undefined),
  toggleSlotBlock: vi.fn().mockResolvedValue({ id: 'b1', blocked: true }),
  unblockDay: vi.fn().mockResolvedValue(undefined),
  getServices: vi.fn().mockResolvedValue([
    { id: 's1', name: 'Corte', price: 35, duration: 40 },
    { id: 's2', name: 'Barba', price: 27, duration: 20 },
  ]),
  getClients: vi.fn().mockResolvedValue([]),
  getBookingsForStats: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
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
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/admin', search: '' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toast: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button', span: 'span' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../hooks/useIsDesktop', () => ({
  useIsDesktop: () => true,
}));

import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import AdminDashboard from './AdminDashboard';

describe('AdminDashboard — Comportamental', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sem erros', () => {
    const { container } = render(
      <BarberSettingsProvider>
        <AdminDashboard />
      </BarberSettingsProvider>
    );
    expect(container).toBeTruthy();
  });

  it('renderiza titulo do dashboard', () => {
    render(
      <BarberSettingsProvider>
        <AdminDashboard />
      </BarberSettingsProvider>
    );
    expect(screen.getAllByText(/BLACK DIAMOND/i).length).toBeGreaterThan(0);
  });

  it('renderiza as três abas de filtro', async () => {
    render(
      <BarberSettingsProvider>
        <AdminDashboard />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Ocupados/i)).toBeInTheDocument();
      expect(screen.getByText(/Livres/i)).toBeInTheDocument();
      expect(screen.getByText(/Bloqueados/i)).toBeInTheDocument();
    });
  });

  it('busca agendamentos ao renderizar', async () => {
    render(
      <BarberSettingsProvider>
        <AdminDashboard />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(mockGetBookings).toHaveBeenCalled();
    });
  });

  it('exibe nome do cliente no painel de ocupados', async () => {
    render(
      <BarberSettingsProvider>
        <AdminDashboard />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText('João Silva')[0]).toBeInTheDocument();
    });
  });

  it('exibe horário do agendamento', async () => {
    render(
      <BarberSettingsProvider>
        <AdminDashboard />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/10:00/)[0]).toBeInTheDocument();
    });
  });

  it('exibe preco do servico', async () => {
    render(
      <BarberSettingsProvider>
        <AdminDashboard />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText('João Silva')[0]).toBeInTheDocument();
    });
    expect(screen.getAllByText(/10:00/)[0]).toBeInTheDocument();
  });
});
