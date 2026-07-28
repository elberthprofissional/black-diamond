import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BookingPreScreen from './BookingPreScreen';

// Mock framer-motion to avoid animation issues in tests
function createMotionComponent<T extends Record<string, unknown>>(tag: string) {
  return ({ children, ...props }: T) => {
    // Filter out framer-motion specific props
    const { initial, animate, exit, transition, whileTap, whileHover, whileInView, variants, ...validProps } = props as Record<string, unknown>;
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

// Mock API - use vi.hoisted to handle vi.mock hoisting
const mockCreateClient = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'new-id' }));
vi.mock('../../lib/api', () => ({
  getClientByPhone: vi.fn(),
  createClient: mockCreateClient,
}));


// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
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
  });

  it('renderiza o menu principal com as 3 opções', () => {
    renderPage();

    // The title "Agendar na Black Diamond" is split across h1 + span elements
    expect(screen.getByText('Já sou cliente')).toBeInTheDocument();
    expect(screen.getByText('Sou novo aqui')).toBeInTheDocument();
    expect(screen.getByText('Agendar sem cadastro')).toBeInTheDocument();
    expect(screen.getByText('Agende seu horário em segundos')).toBeInTheDocument();
  });

  it('navega para /agendar quando clica em Agendar sem cadastro', async () => {
    renderPage();

    await userEvent.click(screen.getByText('Agendar sem cadastro'));
    expect(mockNavigate).toHaveBeenCalledWith('/agendar');
  });

  it('navega para tela de existing-phone ao clicar em Já sou cliente', async () => {
    renderPage();

    await userEvent.click(screen.getByText('Já sou cliente'));
    expect(screen.getByText(/Digite seu telefone/)).toBeInTheDocument();
  });

  it('navega para tela de new-client ao clicar em Sou novo aqui', async () => {
    renderPage();

    await userEvent.click(screen.getByText('Sou novo aqui'));
    expect(screen.getByText(/Seus dados para começar/)).toBeInTheDocument();
  });

  it('volta ao menu principal pelo botão voltar', async () => {
    renderPage();

    // Go to existing client screen first
    await userEvent.click(screen.getByText('Já sou cliente'));
    expect(screen.getByText(/Digite seu telefone/)).toBeInTheDocument();

    // Click back button via aria-label
    const backBtn = screen.getByLabelText('Voltar');
    await userEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Agende seu horário em segundos')).toBeInTheDocument();
    });
  });

  it('novo cliente: mostra erro se nome está vazio', async () => {
    renderPage();

    // Go to new client screen
    await userEvent.click(screen.getByText('Sou novo aqui'));

    // Type a valid phone but leave name empty
    const phoneInput = screen.getByPlaceholderText('(00) 00000-0000');
    await userEvent.type(phoneInput, '11999999999');

    // Click submit
    await userEvent.click(screen.getByText('Começar'));

    // Should show error about name
    await waitFor(() => {
      expect(screen.getByText(/mínimo de 2 caracteres/)).toBeInTheDocument();
    });
  });

  it('novo cliente: mostra erro se telefone é inválido', async () => {
    renderPage();

    await userEvent.click(screen.getByText('Sou novo aqui'));

    // Try submitting without filling anything
    const submitBtn = screen.getByText('Começar');
    await userEvent.click(submitBtn);

    // Should show error about invalid phone
    await waitFor(() => {
      expect(screen.getByText(/celular válido/)).toBeInTheDocument();
    });
  });

  it('novo cliente: cria conta e navega para /cliente', async () => {
    renderPage();

    await userEvent.click(screen.getByText('Sou novo aqui'));

    const nameInput = screen.getByPlaceholderText('Seu nome');
    const phoneInput = screen.getByPlaceholderText('(00) 00000-0000');

    await userEvent.type(nameInput, 'João Silva');
    await userEvent.type(phoneInput, '11999999999');

    const submitBtn = screen.getByText('Começar');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateClient).toHaveBeenCalledWith({
        name: 'João Silva',
        phone: '11999999999',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/cliente');
    });
  });

  it('novo cliente: trata erro de cliente já existente', async () => {
    mockCreateClient.mockRejectedValueOnce(new Error('Este telefone já está cadastrado para outro cliente.'));

    renderPage();

    await userEvent.click(screen.getByText('Sou novo aqui'));

    const nameInput = screen.getByPlaceholderText('Seu nome');
    const phoneInput = screen.getByPlaceholderText('(00) 00000-0000');

    await userEvent.type(nameInput, 'Maria');
    await userEvent.type(phoneInput, '11999999999');

    await userEvent.click(screen.getByText('Começar'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cliente');
    });
  });
});
