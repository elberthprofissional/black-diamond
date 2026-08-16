import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../components/Admin/AuthGuard', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('../lib/api', () => ({
  getBookings: vi.fn().mockResolvedValue([]),
  getServices: vi.fn().mockResolvedValue([]),
  getClients: vi.fn().mockResolvedValue([]),
  deleteAllClients: vi.fn().mockResolvedValue(0),
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
        signOut: vi.fn().mockResolvedValue({ error: null }),
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

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/admin/profile', search: '' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toast: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSubscribed: false,
    subscribe: vi.fn().mockResolvedValue(true),
    unsubscribe: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('../hooks/useAdminLogout', () => ({
  useAdminLogout: () => vi.fn(),
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

vi.mock('../hooks/useBarberSettings', () => ({
  useBarberSettings: () => ({
    barberName: 'Admin',
    barberPhone: '5531999999999',
    barberPhoto: '',
    barberBio: '',
    barberQuote: '',
    barberInstagram: '',
    barberHours: '',
    brandName: 'Black Diamond',
    brandColor: '#D4AF37',
    brandLogo: '',
    brandLoginBg: '',
    loading: false,
    updateBarberName: vi.fn().mockResolvedValue(true),
    updateBarberPhone: vi.fn().mockResolvedValue(true),
    updateBarberPhoto: vi.fn().mockResolvedValue(true),
    updateBarberBio: vi.fn().mockResolvedValue(true),
    updateBarberQuote: vi.fn().mockResolvedValue(true),
    updateBarberInstagram: vi.fn().mockResolvedValue(true),
    updateBarberHours: vi.fn().mockResolvedValue(true),
    updateBrandName: vi.fn().mockResolvedValue(true),
    updateBrandColor: vi.fn().mockResolvedValue(true),
    updateBrandLogo: vi.fn().mockResolvedValue(true),
    updateBrandLoginBg: vi.fn().mockResolvedValue(true),
    updateOnboardingCompleted: vi.fn().mockResolvedValue(true),
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../lib/api/barbers', () => ({
  getBarbers: vi.fn().mockResolvedValue([]),
  getBarberByUserId: vi.fn().mockResolvedValue(null),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BarberProvider } from '../contexts/BarberContext';
import AdminProfile from './AdminProfile';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

describe('AdminProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sem erros', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BarberProvider>
          <AdminProfile />
        </BarberProvider>
      </QueryClientProvider>
    );
    expect(container).toBeTruthy();
  });

  it('renderiza nome do barbeiro', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BarberProvider>
          <AdminProfile />
        </BarberProvider>
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Admin|Barbeiro/i).length).toBeGreaterThan(0);
    });
  });

  it('renderiza botoes de menu do perfil', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BarberProvider>
          <AdminProfile />
        </BarberProvider>
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Editar perfil/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Notificações/i).length).toBeGreaterThan(0);
    });
  });

  it('renderiza acoes rapidas', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BarberProvider>
          <AdminProfile />
        </BarberProvider>
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Notificações/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Off')).toBeInTheDocument();
    });
  });

  it('renderiza botao de limpar dados', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BarberProvider>
          <AdminProfile />
        </BarberProvider>
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Limpar Dados/i).length).toBeGreaterThan(0);
    });
  });
});
