import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import About from './About';

const mockUseBarberSettings = vi.fn(() => ({
  barberName: '',
  barberPhone: '',
  barberPhoto: '',
  barberBio: '',
  barberTeamBio: '',
  barberQuote: '',
  barberInstagram: '',
  onboardingCompleted: false,
  singleBarberMode: false,
  loading: false,
}));

vi.mock('../hooks/useBarberSettings', () => ({
  useBarberSettings: () => mockUseBarberSettings(),
}));

const mockGetBarbers = vi.fn();
vi.mock('../lib/api/barbers', () => ({
  getBarbers: () => mockGetBarbers(),
}));

const BASE_SETTINGS = {
  barberName: '',
  barberPhone: '',
  barberPhoto: '',
  barberBio: '',
  barberTeamBio: '',
  barberQuote: '',
  barberInstagram: '',
  onboardingCompleted: false,
  singleBarberMode: false,
  loading: false,
};

beforeEach(() => {
  mockUseBarberSettings.mockReset();
  mockUseBarberSettings.mockReturnValue(BASE_SETTINGS);
  mockGetBarbers.mockReset();
  mockGetBarbers.mockResolvedValue([]);
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

  it('renderiza o nome personalizado quando configurado', () => {
    mockUseBarberSettings.mockReturnValueOnce({
      barberName: 'Tato',
      barberPhone: '',
      barberPhoto: '',
      barberBio: '',
      barberQuote: '',
      barberInstagram: '',
      onboardingCompleted: false,
      loading: false,
    });
    render(<About />);
    expect(screen.getByText('Tato')).toBeInTheDocument();
  });

  it('renderiza a descricao', () => {
    render(<About />);
    expect(screen.getByText(/Acredito que a barbearia/)).toBeInTheDocument();
  });

  it('nao renderiza frase de efeito quando nao configurada', () => {
    render(<About />);
    expect(
      screen.queryByText(/Não sou o melhor, mas sou o melhor para você/)
    ).not.toBeInTheDocument();
  });

  it('renderiza a frase de efeito personalizada quando configurada', () => {
    mockUseBarberSettings.mockReturnValueOnce({
      barberName: 'Tato',
      barberPhone: '',
      barberPhoto: '',
      barberBio: '',
      barberQuote: 'Cada corte conta uma história',
      barberInstagram: '',
      onboardingCompleted: false,
      loading: false,
    });
    render(<About />);
    expect(screen.getByText(/Cada corte conta uma história/)).toBeInTheDocument();
  });

  it('renderiza placeholder quando nao tem foto', () => {
    render(<About />);
    // Quando nao ha foto, exibe o icone User do Lucide como placeholder
    const icons = document.querySelectorAll('.lucide-user');
    expect(icons.length).toBe(1);
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
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(1);
  });

  it('tem secao com id=sobre para navegacao', () => {
    render(<About />);
    const section = document.getElementById('sobre');
    expect(section).toBeInTheDocument();
  });

  it('com 1 barbeiro ativo mantém Sobre Mim com o nome dele', async () => {
    mockGetBarbers.mockResolvedValue([
      {
        id: 'b1',
        name: 'Tato',
        phone: '4399553590',
        is_active: true,
        photo_url: '',
        bio: '',
        quote: '',
      },
    ]);
    render(<About />);
    expect(await screen.findByText('Tato')).toBeInTheDocument();
    expect(screen.getByText('Sobre Mim')).toBeInTheDocument();
  });

  it('com 2 barbeiros ativos mostra Sobre Nós', async () => {
    mockGetBarbers.mockResolvedValue([
      {
        id: 'b1',
        name: 'Tato',
        phone: '4399553590',
        is_active: true,
        photo_url: '',
        bio: '',
        quote: '',
      },
      {
        id: 'b2',
        name: 'João',
        phone: '4399553600',
        is_active: true,
        photo_url: '',
        bio: '',
        quote: '',
      },
    ]);
    render(<About />);
    expect(await screen.findByText('Sobre Nós')).toBeInTheDocument();
    expect(screen.getByText('Tato')).toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('usa a bio da equipe quando 2+ barbeiros', async () => {
    mockUseBarberSettings.mockReturnValue({
      ...BASE_SETTINGS,
      barberTeamBio: 'Somos uma equipe apaixonada por cortes.',
    });
    mockGetBarbers.mockResolvedValue([
      {
        id: 'b1',
        name: 'Tato',
        phone: '4399553590',
        is_active: true,
        photo_url: '',
        bio: '',
        quote: '',
      },
      {
        id: 'b2',
        name: 'João',
        phone: '4399553600',
        is_active: true,
        photo_url: '',
        bio: '',
        quote: '',
      },
    ]);
    render(<About />);
    expect(await screen.findByText(/Somos uma equipe apaixonada por cortes/)).toBeInTheDocument();
  });

  it('com modo barbeiro único ativo, mantém Sobre Mim mesmo com 2 barbeiros', async () => {
    mockUseBarberSettings.mockReturnValue({
      ...BASE_SETTINGS,
      singleBarberMode: true,
      barberName: 'Tato',
    });
    mockGetBarbers.mockResolvedValue([
      {
        id: 'b1',
        name: 'Tato',
        phone: '4399553590',
        is_active: true,
        photo_url: '',
        bio: '',
        quote: '',
      },
      {
        id: 'b2',
        name: 'João',
        phone: '4399553600',
        is_active: true,
        photo_url: '',
        bio: '',
        quote: '',
      },
    ]);
    render(<About />);
    expect(await screen.findByText('Sobre Mim')).toBeInTheDocument();
    expect(screen.queryByText('Sobre Nós')).not.toBeInTheDocument();
    expect(screen.queryByText('João')).not.toBeInTheDocument();
  });
});
