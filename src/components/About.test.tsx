import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import About from './About';

const mockUseBarberSettings = vi.fn(() => ({
  barberName: '',
  barberPhone: '',
  barberPhoto: '',
  barberBio: '',
  barberQuote: '',
  barberInstagram: '',
  loading: false,
}));

vi.mock('../contexts/BarberSettingsContext', () => ({
  useBarberSettings: () => mockUseBarberSettings(),
}));

beforeEach(() => {
  mockUseBarberSettings.mockReset();
  mockUseBarberSettings.mockReturnValue({
    barberName: '',
    barberPhone: '',
    barberPhoto: '',
    barberBio: '',
    barberQuote: '',
    barberInstagram: '',
    loading: false,
  });
});

describe('About', () => {
  it('renderiza o titulo Sobre Mim', () => {
    render(<About />);
    expect(screen.getByText('Sobre Mim')).toBeInTheDocument();
  });

  it('renderiza o nome Barbeiro como fallback', () => {
    render(<About />);
    expect(screen.getByText('Barbeiro')).toBeInTheDocument();
  });

  it('renderiza a descricao', () => {
    render(<About />);
    expect(screen.getByText(/Acredito que a barbearia/)).toBeInTheDocument();
  });

  it('renderiza a frase de efeito', () => {
    render(<About />);
    expect(screen.getByText(/Não sou o melhor, mas sou o melhor para você/)).toBeInTheDocument();
  });

  it('renderiza placeholder quando nao tem foto', () => {
    render(<About />);
    // Quando nao ha foto, exibe o icone User do Lucide como placeholder
    const icons = document.querySelectorAll('.lucide-user');
    expect(icons.length).toBe(2); // mobile + desktop
  });

  it('renderiza a imagem do barbeiro quando tem foto', () => {
    mockUseBarberSettings.mockReturnValueOnce({
      barberName: 'João',
      barberPhone: '11999999999',
      barberPhoto: 'https://example.com/photo.jpg',
      barberBio: 'Bio qualquer',
      barberQuote: 'Frase',
      barberInstagram: '@joao',
      loading: false,
    });
    render(<About />);
    const images = screen.getAllByAltText('Barbeiro');
    expect(images.length).toBe(2); // mobile + desktop
  });

  it('tem secao com id=sobre para navegacao', () => {
    render(<About />);
    const section = document.getElementById('sobre');
    expect(section).toBeInTheDocument();
  });
});
