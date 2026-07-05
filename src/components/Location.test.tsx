import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import Location from './Location';

describe('Location', () => {
  it('renderiza o titulo', () => {
    render(
      <BarberSettingsProvider>
        <Location />
      </BarberSettingsProvider>
    );
    expect(screen.getByText(/ONDE ESTAMOS/)).toBeInTheDocument();
  });

  it('renderiza o endereco', () => {
    render(
      <BarberSettingsProvider>
        <Location />
      </BarberSettingsProvider>
    );
    expect(screen.getByText(/Av. Brasílio da Gama/)).toBeInTheDocument();
  });

  it('renderiza o horario', () => {
    render(
      <BarberSettingsProvider>
        <Location />
      </BarberSettingsProvider>
    );
    expect(screen.getByText(/08:30 às 19:00/)).toBeInTheDocument();
  });

  it('renderiza o iframe do Google Maps', () => {
    render(
      <BarberSettingsProvider>
        <Location />
      </BarberSettingsProvider>
    );
    const iframe = screen.getByTitle(/Localização da Black Diamond/);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('allowFullScreen');
  });

  it('renderiza link do Google Maps', () => {
    render(
      <BarberSettingsProvider>
        <Location />
      </BarberSettingsProvider>
    );
    const links = screen.getAllByText('Abrir no Google Maps');
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute('href', 'https://maps.app.goo.gl/Gz453umZQtWGYcvV8');
  });

  it('tem secao com id=localização para navegacao', () => {
    render(
      <BarberSettingsProvider>
        <Location />
      </BarberSettingsProvider>
    );
    const section = document.getElementById('localização');
    expect(section).toBeInTheDocument();
  });
});
