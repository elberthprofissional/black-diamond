import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button', span: 'span' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import AdminWeekly from './AdminWeekly';

describe('AdminWeekly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sem erros', () => {
    const { container } = render(
      <BarberSettingsProvider>
        <AdminWeekly />
      </BarberSettingsProvider>
    );
    expect(container).toBeTruthy();
  });

  it('renderiza titulo da agenda semanal', () => {
    render(
      <BarberSettingsProvider>
        <AdminWeekly />
      </BarberSettingsProvider>
    );
    expect(screen.getAllByText(/Agenda da Semana/i).length).toBeGreaterThan(0);
  });

  it('renderiza navegacao por dia da semana', async () => {
    render(
      <BarberSettingsProvider>
        <AdminWeekly />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      const dayButtons = screen.getAllByRole('button');
      expect(dayButtons.length).toBeGreaterThanOrEqual(6);
    });
  });

  it('renderiza abas de filtro', async () => {
    render(
      <BarberSettingsProvider>
        <AdminWeekly />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Ocupados/i)).toBeInTheDocument();
    });
  });

  it('renderiza aba livres', async () => {
    render(
      <BarberSettingsProvider>
        <AdminWeekly />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Livres/i)).toBeInTheDocument();
    });
  });
});
