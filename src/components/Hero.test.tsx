import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Hero from '../components/Hero';
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <BarberSettingsProvider>{ui}</BarberSettingsProvider>
    </MemoryRouter>
  );
};

describe('Hero', () => {
  it('renderiza o titulo BLACK DIAMOND', () => {
    renderWithRouter(<Hero />);
    expect(screen.getByText('Black')).toBeInTheDocument();
    expect(screen.getByText('Diamond')).toBeInTheDocument();
  });

  it('renderiza a descricao', () => {
    renderWithRouter(<Hero />);
    expect(screen.getByText(/Corte na régua/)).toBeInTheDocument();
  });

  it('renderiza a imagem de fundo', () => {
    renderWithRouter(<Hero />);
    const img = screen.getByRole('img', { name: /black diamond/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/assets/hero-bg.webp');
  });
});
