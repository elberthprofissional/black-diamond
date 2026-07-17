import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

import NotFound from './NotFound';

describe('NotFound', () => {
  it('renderiza 404', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renderiza mensagem de pagina nao encontrada', () => {
    render(<NotFound />);
    expect(screen.getByText('Página não encontrada')).toBeInTheDocument();
  });

  it('renderiza botao de voltar', () => {
    render(<NotFound />);
    expect(screen.getByText('Voltar ao início')).toBeInTheDocument();
  });

  it('navega para home ao clicar no botao', () => {
    render(<NotFound />);
    screen.getByText('Voltar ao início').click();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
