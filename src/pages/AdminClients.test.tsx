import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';

vi.mock('../components/Admin/AuthGuard', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../lib/api', () => ({
  getClients: vi.fn().mockResolvedValue([
    {
      id: 'c1',
      name: 'JOÃO SILVA',
      phone: '31999999999',
      created_at: '2026-01-01',
      manually_added: true,
    },
  ]),
  getBookings: vi.fn().mockResolvedValue([]),
  getBookingsForStats: vi.fn().mockResolvedValue([
    {
      client_id: 'c1',
      booking_date: '2026-07-01',
      booking_time: '10:00',
      total_price: 50,
      status: 'completed',
    },
  ]),
  deleteClient: vi.fn().mockResolvedValue(undefined),
  updateClient: vi.fn().mockResolvedValue(undefined),
  updateClientNotes: vi.fn().mockResolvedValue(undefined),
  createClient: vi.fn().mockResolvedValue({
    id: 'c3',
    name: 'NOVO',
    phone: '31777777777',
    created_at: '2026-07-01',
    manually_added: true,
  }),
  toggleClientMensalista: vi.fn().mockResolvedValue(undefined),
  getMensalistaPlans: vi.fn().mockResolvedValue([]),
  getMensalistaEnabled: vi.fn().mockResolvedValue(true),
}));

vi.mock('../lib/supabase', () => {
  const makeBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (onFulfilled: (v: unknown) => void, onRejected: (v: unknown) => void) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(onFulfilled, onRejected),
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
    motion: { div: M('div'), button: M('button') },
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
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import { BarberProvider } from '../contexts/BarberContext';
import AdminClients from './AdminClients';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const renderWithRouter = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <BarberSettingsProvider>
          <BarberProvider>{ui}</BarberProvider>
        </BarberSettingsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

describe('AdminClients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza componente sem erros', () => {
    const { container } = renderWithRouter(<AdminClients />);
    expect(container).toBeTruthy();
  });

  it('renderiza campo de busca', async () => {
    renderWithRouter(<AdminClients />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Pesquisar/i)).toBeInTheDocument();
    });
  });

  it('renderiza botao de novo cliente', async () => {
    renderWithRouter(<AdminClients />);
    await waitFor(() => {
      expect(screen.getByText(/Novo Cliente/i)).toBeInTheDocument();
    });
  });

  it('renderiza filtros de lembrete', async () => {
    renderWithRouter(<AdminClients />);
    await waitFor(() => {
      // AdminClients tem filtros 'Todos', 'A Lembrar', 'Lembrados', 'Inativos' - em dois lugares (mobile + desktop)
      const todosElements = screen.getAllByText(/todos/i);
      expect(todosElements.length).toBeGreaterThanOrEqual(1);
      expect(todosElements[0]).toBeInTheDocument();
    });
  });
});
