import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <BarberSettingsProvider>{ui}</BarberSettingsProvider>
    </MemoryRouter>
  );
};

describe('Navbar', () => {
  it('renderiza o logo', () => {
    renderWithRouter(<Navbar onBookingClick={vi.fn()} />);
    const logo = screen.getByRole('img', { name: /black diamond/i });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/assets/logo.webp');
  });

  it('renderiza links de navegacao', () => {
    renderWithRouter(<Navbar onBookingClick={vi.fn()} />);
    expect(screen.getByText('SOBRE MIM')).toBeInTheDocument();
    expect(screen.getByText('SERVIÇOS')).toBeInTheDocument();
    expect(screen.getByText('GALERIA')).toBeInTheDocument();
    expect(screen.getByText('ONDE ESTAMOS')).toBeInTheDocument();
  });

  it('renderiza botao de agendar', () => {
    renderWithRouter(<Navbar onBookingClick={vi.fn()} />);
    expect(screen.getByText('Agendar')).toBeInTheDocument();
  });

  it('chama onBookingClick ao clicar em Agendar', () => {
    const handleClick = vi.fn();
    renderWithRouter(<Navbar onBookingClick={handleClick} />);

    screen.getByText('Agendar').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('tem aria-label no botao de agendamento', () => {
    renderWithRouter(<Navbar onBookingClick={vi.fn()} />);
    const button = screen.getByLabelText('Agendar um horário');
    expect(button).toBeInTheDocument();
  });
});
