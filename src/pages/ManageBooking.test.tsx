import { createElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockGetBookingsByToken = vi.fn().mockResolvedValue([
  {
    booking_id: 'b1',
    booking_date: '2026-07-10',
    booking_time: '10:00:00',
    total_price: 35,
    total_duration: 40,
    service_names: ['Corte'],
    client_name: 'João Silva',
    client_phone: '11999999999',
    status: 'confirmed',
    is_expired: false,
  },
]);

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams('token=abc123')],
  useNavigate: () => vi.fn(),
}));

vi.mock('../lib/api', () => ({
  getBookingsByToken: (...args: unknown[]) => mockGetBookingsByToken(...args),
  cancelBooking: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
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
    motion: { div: M('div'), button: M('button') },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import ManageBooking from './ManageBooking';

describe('ManageBooking', () => {
  it('renderiza dados do agendamento apos carregar', async () => {
    render(<ManageBooking />);
    await waitFor(() => {
      expect(screen.getByText('Corte')).toBeInTheDocument();
      expect(screen.getByText('Confirmado')).toBeInTheDocument();
    });
  });

  it('renderiza botoes de acao', async () => {
    render(<ManageBooking />);
    await waitFor(() => {
      expect(screen.getByText('Reagendar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });
  });
});
