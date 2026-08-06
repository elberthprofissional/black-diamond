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
  it('renderiza o titulo SERVIÇOS', () => {
    renderWithRouter(<Services />);
    expect(screen.getByText('SERVIÇOS')).toBeInTheDocument();
  });

  it('renderiza todos os servicos', () => {
    renderWithRouter(<Services />);
    expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('Corte + Barba')).toBeInTheDocument();
  });

  it('renderiza precos dos servicos', () => {
    renderWithRouter(<Services />);
    expect(screen.getByText('R$ 45')).toBeInTheDocument();
    expect(screen.getByText('R$ 30')).toBeInTheDocument();
    expect(screen.getByText('R$ 65')).toBeInTheDocument();
  });

  it('tem secao com id=servicos', () => {
    renderWithRouter(<Services />);
    const section = document.getElementById('servicos');
    expect(section).toBeInTheDocument();
  });
});
