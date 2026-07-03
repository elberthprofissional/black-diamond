import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../lib/api', () => ({
  getClients: vi.fn().mockResolvedValue([
    { id: 'c1', name: 'JOÃO SILVA', phone: '31999999999', created_at: '2026-01-01', manually_added: true },
  ]),
  getBookings: vi.fn().mockResolvedValue([]),
  getBookingsForStats: vi.fn().mockResolvedValue([
    { client_id: 'c1', booking_date: '2026-07-01', booking_time: '10:00', total_price: 50, status: 'completed' },
  ]),
  deleteClient: vi.fn().mockResolvedValue(undefined),
  updateClient: vi.fn().mockResolvedValue(undefined),
  updateClientNotes: vi.fn().mockResolvedValue(undefined),
  createClient: vi.fn().mockResolvedValue({ id: 'c3', name: 'NOVO', phone: '31777777777', created_at: '2026-07-01', manually_added: true }),
  toggleClientMensalista: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toast: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import AdminClients from './AdminClients';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter><BarberSettingsProvider>{ui}</BarberSettingsProvider></BrowserRouter>);

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
      expect(screen.getByText(/Todos/i)).toBeInTheDocument();
    });
  });
});
