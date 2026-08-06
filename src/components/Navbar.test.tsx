import { describe, it, expect } from 'vitest';
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
    renderWithRouter(<Navbar />);
    const logo = screen.getByRole('img', { name: /black diamond/i });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/assets/logo.webp');
  });

  it('renderiza links de navegacao', () => {
    renderWithRouter(<Navbar />);
    expect(screen.getByText('SOBRE MIM')).toBeInTheDocument();
    expect(screen.getByText('SERVIÇOS')).toBeInTheDocument();
    expect(screen.getByText('GALERIA')).toBeInTheDocument();
    expect(screen.getByText('ONDE ESTAMOS')).toBeInTheDocument();
  });

  it('renderiza o botão Agendar', () => {
    renderWithRouter(<Navbar />);
    expect(screen.getByText('Agendar')).toBeInTheDocument();
  });

  it('renderiza botao de agendar com aria-label', () => {
    renderWithRouter(<Navbar />);
    const button = screen.getByLabelText('Agendar um horário');
    expect(button).toBeInTheDocument();
  });
});
