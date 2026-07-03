import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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
  useLocation: () => ({ pathname: '/admin/agendar', search: '', state: null }),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../hooks/useIsDesktop', () => ({
  useIsDesktop: () => true,
}));

import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import AdminBooking from './AdminBooking';

describe('AdminBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza titulo do agendamento', () => {
    render(<BarberSettingsProvider><AdminBooking /></BarberSettingsProvider>);
    expect(screen.getAllByText(/Novo Agendamento/i).length).toBeGreaterThan(0);
  });

  it('renderiza secao de cliente', () => {
    render(<BarberSettingsProvider><AdminBooking /></BarberSettingsProvider>);
    expect(screen.getAllByText(/CLIENTE/i).length).toBeGreaterThan(0);
  });

  it('renderiza campo de nome', () => {
    render(<BarberSettingsProvider><AdminBooking /></BarberSettingsProvider>);
    expect(screen.getAllByPlaceholderText(/nome/i).length).toBeGreaterThan(0);
  });

  it('renderiza campo de telefone', () => {
    render(<BarberSettingsProvider><AdminBooking /></BarberSettingsProvider>);
    expect(screen.getAllByPlaceholderText(/00000/i).length).toBeGreaterThan(0);
  });

  it('renderiza secao de servicos', () => {
    render(<BarberSettingsProvider><AdminBooking /></BarberSettingsProvider>);
    expect(screen.getAllByText(/SERVIÇOS/i).length).toBeGreaterThan(0);
  });

  it('renderiza secao de agenda', () => {
    render(<BarberSettingsProvider><AdminBooking /></BarberSettingsProvider>);
    expect(screen.getAllByText(/AGENDA/i).length).toBeGreaterThan(0);
  });

  it('renderiza botao de buscar cliente', () => {
    render(<BarberSettingsProvider><AdminBooking /></BarberSettingsProvider>);
    expect(screen.getAllByText(/Buscar|Dados|Cliente/i).length).toBeGreaterThan(0);
  });

  it('renderiza botao de avancar', () => {
    render(<BarberSettingsProvider><AdminBooking /></BarberSettingsProvider>);
    expect(screen.getAllByText(/Continuar/i).length).toBeGreaterThan(0);
  });
});
