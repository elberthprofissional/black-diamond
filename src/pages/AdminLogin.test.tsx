import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

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

const mockNavigate = vi.fn();
const mockSignIn = vi.fn();
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
const mockResetPassword = vi.fn();
const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();
const mockLogLogin = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPassword(...args),
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

vi.mock('../hooks/useAuditLog', () => ({
  useAuditLog: () => ({
    logLogin: mockLogLogin,
  }),
}));

vi.mock('../hooks/useRateLimit', () => ({
  useRateLimit: () => ({
    isBlocked: false,
    attempts: 0,
    maxAttempts: 5,
    recordAttempt: vi.fn(() => true),
    getTimeUntilReset: vi.fn(() => 0),
  }),
}));

vi.mock('../hooks/useModalA11y', () => ({
  useModalA11y: () => ({
    dialogRef: { current: null },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('framer-motion', () => {
  const MotionEl =
    (tag: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      createElement(tag, props, children);
  return {
    motion: {
      div: MotionEl('div'),
      button: MotionEl('button'),
      form: MotionEl('form'),
      p: MotionEl('p'),
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
  };
});

import AdminLogin from './AdminLogin';

const renderLogin = () =>
  render(
    <BrowserRouter>
      <AdminLogin />
    </BrowserRouter>
  );

describe('AdminLogin — Comportamental', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('redireciona para /admin se já houver sessão ativa', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: '1' } } },
      error: null,
    });
    renderLogin();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('chama signInWithPassword com credenciais corretas', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/senha/i), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'senha123',
      });
    });
  });

  it('navega para /admin após login bem-sucedido', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/senha/i), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('mostra erro com credenciais incorretas', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'wrong@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/senha/i), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/e-mail ou senha incorretos/i)).toBeInTheDocument();
    });
  });

  it('registra tentativa falha no audit log', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid' } });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/senha/i), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockLogLogin).toHaveBeenCalledWith(false, 'admin@test.com');
    });
  });

  it('registra tentativa falha no audit log', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid' } });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/senha/i), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockLogLogin).toHaveBeenCalledWith(false, 'admin@test.com');
    });
  });

  it('abre modal de esqueceu senha ao clicar no link', async () => {
    renderLogin();
    const forgotLink = screen.getAllByText(/esqueceu/i)[0];
    fireEvent.click(forgotLink);

    await waitFor(() => {
      expect(screen.getByText(/redefinir/i)).toBeInTheDocument();
    });
  });

  it('toggle mostra/oculta senha', () => {
    renderLogin();
    const toggle = screen.getByLabelText(/mostrar senha/i);
    fireEvent.click(toggle);
    expect(screen.getByLabelText(/ocultar senha/i)).toBeInTheDocument();
  });
});
