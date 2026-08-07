import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ClientProfile from './ClientProfile';

// Mock framer-motion to avoid animation issues in tests
function createMotionComponent<T extends Record<string, unknown>>(tag: string) {
  return ({ children, ...props }: T) => {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      initial,
      animate,
      exit,
      transition,
      whileTap,
      whileHover,
      whileInView,
      variants,
      layout,
      ...validProps
    } = props as Record<string, unknown>;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return React.createElement(tag, validProps, children);
  };
}

vi.mock('framer-motion', () => {
  const motion: Record<string, ReturnType<typeof createMotionComponent>> = {};
  ['div', 'button', 'span', 'p'].forEach((tag) => {
    motion[tag] = createMotionComponent(tag);
  });
  return {
    motion,
    AnimatePresence: ({ children }: Record<string, unknown>) => <>{children}</>,
  };
});

import React from 'react';

// Mock API
const mockGetBookingsByPhone = vi.hoisted(() => vi.fn());
const mockGetClientByPhone = vi.hoisted(() => vi.fn());
const mockGetClientDashboard = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  getBookingsByPhone: mockGetBookingsByPhone,
  getClientByPhone: mockGetClientByPhone,
  cancelBooking: vi.fn(),
  getServices: vi.fn().mockResolvedValue([]),
  getClientDashboard: mockGetClientDashboard,
}));

vi.mock('../lib/api/mensalista', () => ({
  getMensalistaPlanName: vi.fn().mockResolvedValue(null),
  getMensalistaPlanServices: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/logger', () => ({
  logError: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const booking = {
  id: 'b1',
  booking_date: '2026-08-10',
  booking_time: '10:00:00',
  status: 'confirmed',
  total_price: 35,
  total_duration: 40,
  service_ids: ['s1'],
  clients: { name: 'João Silva', phone: '11999999999' },
};

const dashboardStats = {
  stats: {
    historical_visits: 3,
    historical_spent: 105,
    last_visit_date: '2026-07-01',
    is_mensalista: false,
    mensalista_plan_id: null,
    mensalista_expires_at: null,
  },
  history: [],
};

const renderPage = () => {
  return render(
    <MemoryRouter>
      <ClientProfile />
    </MemoryRouter>
  );
};

describe('ClientProfile (sem código de acesso)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetBookingsByPhone.mockResolvedValue([booking]);
    mockGetClientByPhone.mockResolvedValue({ id: 'c1', name: 'João Silva', phone: '11999999999' });
    mockGetClientDashboard.mockResolvedValue(dashboardStats);
  });

  it('mostra a tela de telefone no primeiro acesso (sem código)', () => {
    renderPage();

    expect(screen.getByText(/Digite seu telefone/)).toBeInTheDocument();
    // Fluxo antigo de código não existe mais
    expect(screen.queryByText(/Código de acesso/)).not.toBeInTheDocument();
  });

  it('telefone válido entra direto no dashboard, sem verificar código', async () => {
    renderPage();

    const phoneInput = screen.getByPlaceholderText('(00) 00000-0000');
    await userEvent.type(phoneInput, '11999999999');
    await userEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(screen.getByText('Olá, João Silva!')).toBeInTheDocument();
    });
    // Não deve existir a etapa de digitar código
    expect(screen.queryByText(/Digite o código/)).not.toBeInTheDocument();
    expect(mockGetBookingsByPhone).toHaveBeenCalledWith('11999999999');
  });

  it('desabilita o botão até o telefone ter 11 dígitos', async () => {
    renderPage();

    const phoneInput = screen.getByPlaceholderText('(00) 00000-0000');
    const submitBtn = screen.getByText('Entrar').closest('button');
    expect(submitBtn).toBeDisabled();

    await userEvent.type(phoneInput, '11999');
    expect(submitBtn).toBeDisabled();

    await userEvent.type(phoneInput, '999999');
    expect(submitBtn).not.toBeDisabled();
  });

  it('sessão salva restaura o dashboard direto, sem pedir telefone', async () => {
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Olá, Maria Oliveira!')).toBeInTheDocument();
    });
    expect(mockGetBookingsByPhone).toHaveBeenCalledWith('11988888888');
  });

  it('salva a sessão ao entrar pelo telefone', async () => {
    renderPage();

    const phoneInput = screen.getByPlaceholderText('(00) 00000-0000');
    await userEvent.type(phoneInput, '11999999999');
    await userEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      const session = JSON.parse(localStorage.getItem('bd_client_session') || '{}');
      expect(session.phone).toBe('11999999999');
      expect(session.name).toBe('João Silva');
    });
  });
});
