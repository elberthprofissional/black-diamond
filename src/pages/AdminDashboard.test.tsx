import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/api', () => ({
  getBookings: vi.fn().mockResolvedValue([]),
  getAvailableSlots: vi.fn().mockResolvedValue(['08:00', '09:00', '10:00']),
  getServices: vi.fn().mockResolvedValue([
    { id: 's1', name: 'Corte', price: 35, duration: 40 },
  ]),
  updateBookingStatus: vi.fn().mockResolvedValue(undefined),
  deleteBooking: vi.fn().mockResolvedValue(undefined),
  toggleSlotBlock: vi.fn().mockResolvedValue({ id: 'b1', blocked: true }),
  unblockDay: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/admin', search: '' }),
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

import AdminDashboard from './AdminDashboard';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sem erros', () => {
    const { container } = render(<AdminDashboard />);
    expect(container).toBeTruthy();
  });

  it('renderiza titulo do dashboard', () => {
    render(<AdminDashboard />);
    expect(screen.getAllByText(/BLACK DIAMOND/i).length).toBeGreaterThan(0);
  });

  it('renderiza abas de filtro', async () => {
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Ocupados/i)).toBeInTheDocument();
    });
  });

  it('renderiza aba de livres', async () => {
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Livres/i)).toBeInTheDocument();
    });
  });

  it('renderiza aba de bloqueados', async () => {
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Bloqueados/i)).toBeInTheDocument();
    });
  });
});
