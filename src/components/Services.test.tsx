import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Services from './Services';

vi.mock('../hooks/useBarberSettings', () => ({
  useBarberSettings: () => ({
    barberPhone: '5531999999999',
    barberName: 'Admin',
    barberPhoto: '',
    barberBio: '',
    barberQuote: '',
    barberInstagram: '',
    barberHours: '',
    loading: false,
    updateBarberName: vi.fn(),
    updateBarberPhone: vi.fn(),
    updateBarberPhoto: vi.fn(),
    updateBarberBio: vi.fn(),
    updateBarberQuote: vi.fn(),
    updateBarberInstagram: vi.fn(),
    updateBarberHours: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useServices', () => ({
  useServices: () => ({
    services: [
      { id: '1', name: 'Corte Masculino', price: 45, duration: 30 },
      { id: '2', name: 'Barba', price: 30, duration: 20 },
      { id: '3', name: 'Corte + Barba', price: 65, duration: 45 },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('Services', () => {
  it('renderiza o titulo da secao', () => {
    renderWithRouter(<Services onBookingClick={vi.fn()} />);
    expect(screen.getByText('Tabela de Serviços')).toBeInTheDocument();
  });

  it('renderiza todos os servicos', () => {
    renderWithRouter(<Services onBookingClick={vi.fn()} />);
    expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('Corte + Barba')).toBeInTheDocument();
  });

  it('renderiza precos dos servicos', () => {
    renderWithRouter(<Services onBookingClick={vi.fn()} />);
    expect(screen.getByText('R$ 45')).toBeInTheDocument();
    expect(screen.getByText('R$ 30')).toBeInTheDocument();
    expect(screen.getByText('R$ 65')).toBeInTheDocument();
  });

  it('chama onBookingClick ao clicar em um servico', async () => {
    const handleClick = vi.fn();
    renderWithRouter(<Services onBookingClick={handleClick} />);

    const serviceItem = screen.getByText('Corte Masculino');
    serviceItem.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('tem role=list para acessibilidade', () => {
    renderWithRouter(<Services onBookingClick={vi.fn()} />);
    expect(screen.getByRole('list', { name: /lista de serviços/i })).toBeInTheDocument();
  });

  it('servicos tem role=listitem', () => {
    renderWithRouter(<Services onBookingClick={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(3);
  });

  it('servicos sao acessiveis por teclado', () => {
    renderWithRouter(<Services onBookingClick={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    items.forEach((item) => {
      expect(item).toHaveAttribute('tabindex', '0');
    });
  });
});
