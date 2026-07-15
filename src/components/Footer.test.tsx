import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import Footer from './Footer';

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
    expect(screen.getByText('BLACK DIAMOND')).toBeInTheDocument();
  });

  it('renderiza o copyright', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(/© 2026 Black Diamond/)).toBeInTheDocument();
  });

  it('nao renderiza link do Instagram quando nao configurado', () => {
    renderWithRouter(<Footer />);
    expect(screen.queryByLabelText(/perfil no instagram/i)).not.toBeInTheDocument();
  });

  it('renderiza link do WhatsApp', () => {
    renderWithRouter(<Footer />);
    const whatsappLink = screen.getByLabelText(/whatsapp/i);
    expect(whatsappLink).toBeInTheDocument();
  });

  it('renderiza a secao de horario de funcionamento', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText('Horário de Funcionamento')).toBeInTheDocument();
  });

  it('renderiza endereco', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(/Av. Brasílio da Gama/)).toBeInTheDocument();
  });

  it('link para admin esta presente', () => {
    renderWithRouter(<Footer />);
    const adminLink = screen.getByLabelText(/acesso restrito/i);
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('href', '/admin/login');
  });

  it('links externos tem target=_blank e rel=noopener', () => {
    renderWithRouter(<Footer />);
    const devLink = screen.getByText('Criado por Elberth Mayan');
    expect(devLink).toHaveAttribute('target', '_blank');
    expect(devLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
