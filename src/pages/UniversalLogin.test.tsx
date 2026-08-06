import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
const mockGetClientByPhone = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: (..._args: unknown[]) => Promise.resolve({ data: null, error: null }),
  },
}));

vi.mock('../lib/api', () => ({
  getClientByPhone: (...args: unknown[]) => mockGetClientByPhone(...args),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ toast: null, showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock('../hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logLogin: vi.fn() }),
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
  useModalA11y: () => ({ dialogRef: { current: null } }),
}));

vi.mock('../hooks/useBarberSettings', () => ({
  useBarberSettings: () => ({ brandColor: '#d4af37', brandLogo: null, brandName: '' }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('framer-motion', () => {
  const FM_PROPS = new Set([
    'whileHover',
    'whileTap',
    'whileFocus',
    'whileDrag',
    'whileInView',
    'layoutId',
    'layout',
    'animate',
    'initial',
    'exit',
    'transition',
    'variants',
    'onAnimationStart',
    'onAnimationComplete',
  ]);
  const MotionEl =
    (tag: string) =>
    ({ children, ...props }: Record<string, unknown>) => {
      const safe = Object.fromEntries(Object.entries(props).filter(([k]) => !FM_PROPS.has(k)));
      return createElement(tag, safe, children);
    };
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

import UniversalLogin from './UniversalLogin';

const renderUniversal = (props?: { adminMode?: boolean }) =>
  render(
    <MemoryRouter>
      <UniversalLogin {...props} />
    </MemoryRouter>
  );

describe('UniversalLogin — Porta Única', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('celular válido entra como cliente, salva sessão e navega para /cliente', async () => {
    mockGetClientByPhone.mockResolvedValue({ id: 'c1', name: 'João Silva', phone: '11999999999' });
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: '11999999999' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cliente');
      const session = JSON.parse(localStorage.getItem('bd_client_session') || '{}');
      expect(session.phone).toBe('11999999999');
      expect(session.name).toBe('João Silva');
    });
  });

  it('celular sem cadastro entra como Cliente e ainda salva a sessão', async () => {
    mockGetClientByPhone.mockResolvedValue(null);
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: '11999999999' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cliente');
      const session = JSON.parse(localStorage.getItem('bd_client_session') || '{}');
      expect(session.name).toBe('Cliente');
    });
  });

  it('mostra erro para entrada que não é celular nem e-mail', async () => {
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: 'abc' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));

    await waitFor(() => {
      expect(screen.getByText(/celular com DDD/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('e-mail revela o formulário do admin (senha) na mesma tela', async () => {
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: 'tato@test.com' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));

    await waitFor(() => {
      expect(screen.getByTestId('input-email')).toBeInTheDocument();
      expect(screen.getByTestId('input-password')).toBeInTheDocument();
      expect((screen.getByTestId('input-email') as HTMLInputElement).value).toBe('tato@test.com');
    });
  });

  it('modo adminMode abre direto no formulário do admin', async () => {
    renderUniversal({ adminMode: true });

    expect(screen.getByTestId('input-email')).toBeInTheDocument();
    expect(screen.getByTestId('input-password')).toBeInTheDocument();
    expect(screen.queryByTestId('input-universal')).not.toBeInTheDocument();
  });

  it('voltar do modo admin limpa o campo e retorna ao modo cliente', async () => {
    renderUniversal();

    // E-mail → modo admin
    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: 'tato@test.com' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));
    await waitFor(() => {
      expect(screen.getByTestId('input-password')).toBeInTheDocument();
    });

    // "Não é admin?" → volta ao modo cliente com campo limpo
    fireEvent.click(screen.getByText(/não é admin/i));
    expect(screen.getByTestId('input-universal')).toBeInTheDocument();
    expect((screen.getByTestId('input-universal') as HTMLInputElement).value).toBe('');
  });

  it('link "Agendar sem login" leva para /agendar', async () => {
    renderUniversal();

    fireEvent.click(screen.getByText(/agendar sem login/i));
    expect(mockNavigate).toHaveBeenCalledWith('/agendar');
  });

  it('redireciona para /admin se já houver sessão ativa', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: '1' } } },
      error: null,
    });
    renderUniversal();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });
});
