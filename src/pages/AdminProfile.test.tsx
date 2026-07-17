import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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
      },
    },
  };
});

vi.mock('react-router-dom', () => ({
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

import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import AdminProfile from './AdminProfile';

describe('AdminProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sem erros', async () => {
    const { container } = render(
      <BarberSettingsProvider>
        <AdminProfile />
      </BarberSettingsProvider>
    );
    expect(container).toBeTruthy();
  });

  it('renderiza titulo do perfil', async () => {
    render(
      <BarberSettingsProvider>
        <AdminProfile />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/BLACK DIAMOND/i).length).toBeGreaterThan(0);
    });
  });

  it('renderiza metricas de faturamento', async () => {
    render(
      <BarberSettingsProvider>
        <AdminProfile />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Faturamento Total/i).length).toBeGreaterThan(0);
    });
  });

  it('renderiza botao de notificacoes', async () => {
    render(
      <BarberSettingsProvider>
        <AdminProfile />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Notificar/i).length).toBeGreaterThan(0);
    });
  });

  it('renderiza botao de limpar dados', async () => {
    render(
      <BarberSettingsProvider>
        <AdminProfile />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Limpar/i).length).toBeGreaterThan(0);
    });
  });
});
