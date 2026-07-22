import { createElement } from 'react';
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

import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import { BarberProvider } from '../contexts/BarberContext';
import AdminWeekly from './AdminWeekly';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <BarberSettingsProvider>
      <BarberProvider>{children}</BarberProvider>
    </BarberSettingsProvider>
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

  it('renderiza titulo da agenda semanal', () => {
    render(
      <Wrapper>
        <AdminWeekly />
      </Wrapper>
    );
    expect(screen.getAllByText(/Agenda da Semana/i).length).toBeGreaterThan(0);
  });

  it('renderiza navegacao por dia da semana', async () => {
    render(
      <Wrapper>
        <AdminWeekly />
      </Wrapper>
    );
    await waitFor(() => {
      const dayButtons = screen.getAllByRole('button');
      expect(dayButtons.length).toBeGreaterThanOrEqual(6);
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
