import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import Footer from './Footer';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <BarberSettingsProvider>{ui}</BarberSettingsProvider>
    </MemoryRouter>
  );
};

describe('Footer', () => {
  it('renderiza o nome da marca', () => {
    renderWithRouter(<Footer />);
    const names = screen.getAllByText(/black diamond/i);
    expect(names.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza o copyright', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(/© 2026 Black Diamond/)).toBeInTheDocument();
  });

  it('nao renderiza link do Instagram quando nao configurado', () => {
    renderWithRouter(<Footer />);
    expect(screen.queryByLabelText(/instagram/i)).not.toBeInTheDocument();
  });

  it('nao renderiza link do WhatsApp quando numero nao configurado', () => {
    renderWithRouter(<Footer />);
    expect(screen.queryByLabelText(/whatsapp/i)).not.toBeInTheDocument();
  });

  it('renderiza endereco', () => {
    renderWithRouter(<Footer />);
    const addresses = screen.getAllByText(/Av. Brasílio da Gama/);
    expect(addresses.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza o link de admin', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
  });
});
