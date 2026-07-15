import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import Location from './Location';

vi.mock('../lib/supabase', () => {
  const makeBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (onFulfilled: (v: unknown) => void, onRejected: (v: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected),
    };
    return builder;
  };

  return {
    supabase: {
      from: vi.fn(() => makeBuilder()),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  };
});

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

  it('renderiza a secao de horario', () => {
    render(
      <BarberSettingsProvider>
        <Location />
      </BarberSettingsProvider>
    );
    expect(screen.getByText('Horário')).toBeInTheDocument();
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

  it('tem secao com id=localizacao para navegacao', () => {
    render(
      <BarberSettingsProvider>
        <Location />
      </BarberSettingsProvider>
    );
    const section = document.getElementById('localizacao');
    expect(section).toBeInTheDocument();
  });
});
