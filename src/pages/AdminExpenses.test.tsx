import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../lib/api', () => ({
  getExpenses: vi.fn().mockResolvedValue([
    { id: 'e1', description: 'Aluguel', amount: 2000, expense_date: '2026-07-01', category: 'Fixo' },
  ]),
  createExpense: vi.fn().mockResolvedValue({ id: 'e2' }),
  deleteExpense: vi.fn().mockResolvedValue(undefined),
  getFixedExpenses: vi.fn().mockResolvedValue([
    { id: 'f1', description: 'Aluguel', amount: 2000, category: 'Fixo', active: true },
  ]),
  updateFixedExpense: vi.fn().mockResolvedValue(undefined),
  getBookingsForStats: vi.fn().mockResolvedValue([]),
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
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import AdminExpenses from './AdminExpenses';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

describe('AdminExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza titulo Investimentos', async () => {
    renderWithRouter(<AdminExpenses />);
    await waitFor(() => {
      expect(screen.getByText(/Investimentos/i)).toBeInTheDocument();
    });
  });

  it('renderiza nome da despesa', async () => {
    renderWithRouter(<AdminExpenses />);
    await waitFor(() => {
      expect(screen.getByText('Aluguel')).toBeInTheDocument();
    });
  });

  it('renderiza navegacao de meses', async () => {
    renderWithRouter(<AdminExpenses />);
    await waitFor(() => {
      const monthRegex = /Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro/;
      expect(screen.getByText(monthRegex)).toBeInTheDocument();
    });
  });
});
