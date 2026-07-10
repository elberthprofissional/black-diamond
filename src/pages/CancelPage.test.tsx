import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockGetBookingsByPhone = vi.fn();
const mockGetBookingsByToken = vi.fn();
const mockCancelBooking = vi.fn();
const mockGetAvailableSlots = vi.fn();
const mockCreateBooking = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: null,
      pathname: '/cancelar',
      search: '',
      hash: '',
      key: 'default',
    }),
  };
});

vi.mock('../lib/api', () => ({
  getBookingsByPhone: (...args: unknown[]) => mockGetBookingsByPhone(...args),
  getBookingsByToken: (...args: unknown[]) => mockGetBookingsByToken(...args),
  cancelBooking: (...args: unknown[]) => mockCancelBooking(...args),
  getAvailableSlots: (...args: unknown[]) => mockGetAvailableSlots(...args),
  createBooking: (...args: unknown[]) => mockCreateBooking(...args),
}));

import CancelPage from './CancelPage';

const renderPage = () =>
  render(
    <BrowserRouter>
      <CancelPage />
    </BrowserRouter>
  );

describe('CancelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAvailableSlots.mockResolvedValue(['08:00', '09:00', '10:00']);
  });

  it('renderiza titulo da pagina', () => {
    renderPage();
    expect(screen.getByText(/cancelar ou reagendar/i)).toBeInTheDocument();
  });

  it('renderiza campo de telefone', () => {
    renderPage();
    expect(screen.getByPlaceholderText('(00) 00000-0000')).toBeInTheDocument();
  });

  it('renderiza botao de buscar', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument();
  });

  it('mostra erro quando telefone invalido', async () => {
    renderPage();
    const input = screen.getByPlaceholderText('(00) 00000-0000');
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText(/celular válido/i)).toBeInTheDocument();
    });
  });

  it('busca agendamentos por telefone', async () => {
    mockGetBookingsByPhone.mockResolvedValue([
      {
        id: 'b1',
        booking_date: '2026-07-15',
        booking_time: '10:00:00',
        total_price: 35,
        service_ids: ['s1'],
        clients: { name: 'João', phone: '11999887766' },
      },
    ]);

    renderPage();
    const input = screen.getByPlaceholderText('(00) 00000-0000');
    fireEvent.change(input, { target: { value: '11999887766' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(mockGetBookingsByPhone).toHaveBeenCalledWith('11999887766');
    });
  });

  it('mostra lista de agendamentos', async () => {
    mockGetBookingsByPhone.mockResolvedValue([
      {
        id: 'b1',
        booking_date: '2026-07-15',
        booking_time: '10:00:00',
        total_price: 35,
        service_ids: ['s1'],
        clients: { name: 'João', phone: '11999887766' },
      },
    ]);

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), {
      target: { value: '11999887766' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText(/reagendar/i)).toBeInTheDocument();
      expect(screen.getByText(/cancelar/i)).toBeInTheDocument();
    });
  });

  it('mostra mensagem quando nenhum agendamento encontrado', async () => {
    mockGetBookingsByPhone.mockResolvedValue([]);

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), {
      target: { value: '11999887766' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nenhum agendamento futuro/i)).toBeInTheDocument();
    });
  });

  it('cancela agendamento sem token', async () => {
    mockGetBookingsByPhone.mockResolvedValue([
      {
        id: 'b1',
        booking_date: '2026-07-15',
        booking_time: '10:00:00',
        total_price: 35,
        service_ids: ['s1'],
        clients: { name: 'João', phone: '11999887766' },
      },
    ]);
    mockCancelBooking.mockResolvedValue({});

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), {
      target: { value: '11999887766' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText(/quarta-feira/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /^cancelar$/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(mockCancelBooking).toHaveBeenCalledWith('b1', undefined);
    });
  });

  it('mostra erro quando busca falha', async () => {
    mockGetBookingsByPhone.mockRejectedValue(new Error('network'));

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), {
      target: { value: '11999887766' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText(/erro ao buscar/i)).toBeInTheDocument();
    });
  });

  it('permite voltar para busca de telefone', async () => {
    mockGetBookingsByPhone.mockResolvedValue([]);

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), {
      target: { value: '11999887766' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nenhum agendamento futuro/i)).toBeInTheDocument();
    });
  });

  it('renderiza logo', () => {
    renderPage();
    const logo = screen.getByAltText('Black Diamond');
    expect(logo).toBeInTheDocument();
  });
});
