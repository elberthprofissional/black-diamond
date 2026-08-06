import { createElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ toast: null, showSuccess: vi.fn(), showError: vi.fn() }),
}));

vi.mock('../hooks/useIsDesktop', () => ({
  useIsDesktop: () => true,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    })),
    rpc: vi.fn(() => ({
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  },
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
    motion: { div: M('div'), button: M('button'), main: M('main'), span: M('span'), p: M('p') },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingPage from './BookingPage';
import { BarberProvider } from '../contexts/BarberContext';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

describe('BookingPage', () => {
  it('renderiza o componente sem erros', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BarberProvider>
            <BookingPage />
          </BarberProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
    // O provider renderiza sem erros — verifica que há elementos no DOM
    const texts = screen.getAllByText(/black|diamond/i);
    expect(texts.length).toBeGreaterThanOrEqual(1);
  });
});
