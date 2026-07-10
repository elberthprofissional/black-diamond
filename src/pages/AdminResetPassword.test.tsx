import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockUpdateUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: { user: {} } }, error: null });
const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toast: null,
    showError: mockShowError,
    showSuccess: mockShowSuccess,
  }),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import AdminResetPassword from './AdminResetPassword';

const renderPage = () =>
  render(
    <BrowserRouter>
      <AdminResetPassword />
    </BrowserRouter>
  );

describe('AdminResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } }, error: null });
  });

  it('renderiza os campos de senha', () => {
    renderPage();
    expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
  });

  it('renderiza botao de salvar', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
  });

  it('renderiza titulo no desktop', () => {
    renderPage();
    expect(screen.getByText(/redefinir/i)).toBeInTheDocument();
  });

  it('mostra erro quando senhas nao coincidem', async () => {
    renderPage();
    const passwordInput = screen.getByLabelText(/nova senha/i);
    const confirmInput = screen.getByLabelText(/confirmar senha/i);

    fireEvent.change(passwordInput, { target: { value: 'senha1234' } });
    fireEvent.change(confirmInput, { target: { value: 'senha5678' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('As senhas não coincidem.');
    });
  });

  it('mostra erro quando senha tem menos de 8 caracteres', async () => {
    renderPage();
    const passwordInput = screen.getByLabelText(/nova senha/i);
    const confirmInput = screen.getByLabelText(/confirmar senha/i);

    fireEvent.change(passwordInput, { target: { value: '1234' } });
    fireEvent.change(confirmInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('A senha deve ter pelo menos 8 caracteres.');
    });
  });

  it('mostra erro quando campos estao vazios', async () => {
    renderPage();
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Preencha todos os campos.');
    });
  });

  it('chama updateUser com senha correta', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    renderPage();

    const passwordInput = screen.getByLabelText(/nova senha/i);
    const confirmInput = screen.getByLabelText(/confirmar senha/i);

    fireEvent.change(passwordInput, { target: { value: 'nova_senha_123' } });
    fireEvent.change(confirmInput, { target: { value: 'nova_senha_123' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'nova_senha_123' });
    });
  });

  it('mostra sucesso e redireciona apos atualizar', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    renderPage();

    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senha_valida_123' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: 'senha_valida_123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('Senha alterada com sucesso!');
    });

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin');
      },
      { timeout: 2000 }
    );
  });

  it('mostra erro quando updateUser falha', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'fail' } });
    renderPage();

    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senha_valida_123' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: 'senha_valida_123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erro ao atualizar a senha. Tente novamente.');
    });
  });

  it('mostra erro quando updateUser throw', async () => {
    mockUpdateUser.mockRejectedValue(new Error('network'));
    renderPage();

    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senha_valida_123' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: 'senha_valida_123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erro ao tentar atualizar a senha.');
    });
  });

  it('toggle mostra/oculta senha', () => {
    renderPage();
    const toggleButtons = screen.getAllByRole('button', { name: /mostrar senha/i });
    expect(toggleButtons.length).toBe(2);

    fireEvent.click(toggleButtons[0]);
    const hiddenButtons = screen.getAllByLabelText(/ocultar senha/i);
    expect(hiddenButtons.length).toBe(2);
  });

  it('botao voltar navega para login', () => {
    renderPage();
    const backButton = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('.lucide-arrow-left'));
    expect(backButton).toBeTruthy();
    fireEvent.click(backButton!);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
  });
});
