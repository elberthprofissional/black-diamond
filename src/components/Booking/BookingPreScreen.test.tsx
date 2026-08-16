import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import BookingPreScreen from './BookingPreScreen';

// Mock framer-motion to avoid animation issues in tests
function createMotionComponent<T extends Record<string, unknown>>(tag: string) {
  return ({ children, ...props }: T) => {
    // Filter out framer-motion specific props
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      initial,
      animate,
      exit,
      transition,
      whileTap,
      whileHover,
      whileInView,
      variants,
      ...validProps
    } = props as Record<string, unknown>;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return React.createElement(tag, validProps, children);
  };
}

vi.mock('framer-motion', () => {
  const motion: Record<string, ReturnType<typeof createMotionComponent>> = {};
  ['div', 'button', 'span', 'p', 'h1', 'h2', 'blockquote'].forEach((tag) => {
    motion[tag] = createMotionComponent(tag);
  });
  return {
    motion,
    AnimatePresence: ({ children }: Record<string, unknown>) => <>{children}</>,
  };
});

import React from 'react';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderPage = () => {
  return render(
    <MemoryRouter>
      <BookingPreScreen />
    </MemoryRouter>
  );
};

describe('BookingPreScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      configurable: true,
    });
  });

  it('renderiza o menu principal com as 2 opções', () => {
    renderPage();

    expect(screen.getByText('Agendar agora')).toBeInTheDocument();
    expect(screen.getByText('Entrar')).toBeInTheDocument();
    expect(screen.getByText('Agende seu horário em segundos')).toBeInTheDocument();
    // Fluxo antigo de código removido
    expect(screen.queryByText('Já sou cliente')).not.toBeInTheDocument();
    expect(screen.queryByText('Sou novo aqui')).not.toBeInTheDocument();
  });

  it('navega para /agendar ao clicar em Agendar agora', async () => {
    renderPage();

    await userEvent.click(screen.getByText('Agendar agora'));
    expect(mockNavigate.mock.calls[0]?.[0]).toBe('/agendar');
  });

  it('pré-preenche nome e telefone quando o cliente tem sessão salva', async () => {
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11999999999',
        name: 'João Silva',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await userEvent.click(screen.getByText('Agendar agora'));
    expect(mockNavigate.mock.calls[0]?.[0]).toBe('/agendar');
    expect(mockNavigate.mock.calls[0]?.[1]).toEqual({
      state: { name: 'João Silva', phone: '11999999999' },
    });
  });

  it('navega para /entrar (porta única) ao clicar em Entrar', async () => {
    renderPage();

    await userEvent.click(screen.getByText('Entrar'));
    expect(mockNavigate.mock.calls[0]?.[0]).toBe('/entrar');
  });

  it('volta para a home pelo botão voltar', async () => {
    renderPage();

    const backBtn = screen.getByLabelText('Voltar');
    await userEvent.click(backBtn);

    expect(mockNavigate.mock.calls[0]?.[0]).toBe('/');
  });

  it('mostra saudação personalizada quando há sessão salva', async () => {
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11999999999',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    expect(screen.getByText(/Que bom te ver de novo, Maria!/)).toBeInTheDocument();
  });

  it('renderiza o layout mobile (centralizado) em telas < 1024px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });

    renderPage();

    expect(screen.getByText('Agendar agora')).toBeInTheDocument();
    expect(screen.getByText('Entrar')).toBeInTheDocument();
    // Detalhes da barbearia são exclusivos do layout desktop
    expect(screen.queryByText(/Corte na régua/)).not.toBeInTheDocument();
  });

  it('renderiza detalhes da barbearia no layout desktop (>= 1024px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });

    renderPage();

    expect(screen.getByText(/Seu estilo/)).toBeInTheDocument();
    expect(screen.getByText(/Seg–Sáb · 08h às 18h/)).toBeInTheDocument();
    expect(screen.getByText('Agendar agora')).toBeInTheDocument();
  });
});
