import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

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
const mockResolverLoginProfissional = vi.fn();
const mockBuscarClientesPorNome = vi.fn();
const mockVerificarSenhaCliente = vi.fn();
const mockCriarSenhaCliente = vi.fn();

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

vi.mock('../lib/api/clientAuth', () => ({
  resolverLoginProfissional: (...args: unknown[]) => mockResolverLoginProfissional(...args),
  buscarClientesPorNome: (...args: unknown[]) => mockBuscarClientesPorNome(...args),
  verificarSenhaCliente: (...args: unknown[]) => mockVerificarSenhaCliente(...args),
  criarSenhaCliente: (...args: unknown[]) => mockCriarSenhaCliente(...args),
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

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
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

describe('UniversalLogin — Porta Única v3.36', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockVerificarSenhaCliente.mockResolvedValue({ ok: false, needs_password: false });
    mockResolverLoginProfissional.mockResolvedValue({ type: 'none' });
    mockBuscarClientesPorNome.mockResolvedValue([]);
  });

  it('celular sem senha oferece entrar direto e navega para /cliente', async () => {
    mockVerificarSenhaCliente.mockResolvedValue({ ok: false, needs_password: false });
    mockGetClientByPhone.mockResolvedValue({ id: 'c1', name: 'João Silva', phone: '11999999999' });
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: '11999999999' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-enter-no-password')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-enter-no-password'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cliente');
      const session = JSON.parse(localStorage.getItem('bd_client_session') || '{}');
      expect(session.phone).toBe('11999999999');
      expect(session.name).toBe('João Silva');
    });
  });

  it('cliente sem cadastro entra como Cliente e ainda salva a sessão', async () => {
    mockGetClientByPhone.mockResolvedValue(null);
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: '11999999999' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-enter-no-password')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-enter-no-password'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cliente');
      const session = JSON.parse(localStorage.getItem('bd_client_session') || '{}');
      expect(session.name).toBe('Cliente');
    });
  });

  it('cliente com senha criada pede a senha e valida antes de entrar', async () => {
    mockVerificarSenhaCliente.mockResolvedValueOnce({
      ok: false,
      needs_password: true,
      name: 'João Silva',
    });
    mockVerificarSenhaCliente.mockResolvedValueOnce({
      ok: true,
      needs_password: true,
      name: 'João Silva',
      phone: '11999999999',
      client_id: 'c1',
    });
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: '11999999999' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));

    await waitFor(() => {
      expect(screen.getByTestId('input-client-password')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-client-password'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(screen.getByTestId('btn-client-login'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cliente');
      const session = JSON.parse(localStorage.getItem('bd_client_session') || '{}');
      expect(session.hasPassword).toBe(true);
    });
  });

  it('cliente sem senha pode criar uma senha direto do login', async () => {
    mockVerificarSenhaCliente.mockResolvedValue({ ok: false, needs_password: false });
    mockGetClientByPhone.mockResolvedValue({ id: 'c1', name: 'Maria', phone: '11999999999' });
    mockCriarSenhaCliente.mockResolvedValue({ ok: true, name: 'Maria' });
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: '11999999999' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-go-create-password')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-go-create-password'));

    fireEvent.change(screen.getByTestId('input-new-password'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByTestId('input-confirm-password'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(screen.getByTestId('btn-create-password'));

    await waitFor(() => {
      expect(mockCriarSenhaCliente).toHaveBeenCalledWith('11999999999', 'senha123');
      expect(mockNavigate).toHaveBeenCalledWith('/cliente');
    });
  });

  it('nome de barbeiro resolve para o painel admin com e-mail preenchido', async () => {
    mockResolverLoginProfissional.mockResolvedValue({
      type: 'profissional',
      email: 'tato@blackdiamond.com',
      name: 'Tato',
      phone: '4399553590',
    });
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: 'Tato' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));

    await waitFor(() => {
      expect(screen.getByTestId('input-email')).toBeInTheDocument();
      expect((screen.getByTestId('input-email') as HTMLInputElement).value).toBe(
        'tato@blackdiamond.com'
      );
    });
  });

  it('nome de cliente com múltiplos matches mostra desambiguação', async () => {
    mockBuscarClientesPorNome.mockResolvedValue([
      {
        id: 'c1',
        name: 'Maria Teste',
        phone: '31977776666',
        phone_masked: '(31) *****-**66',
        has_password: false,
      },
      {
        id: 'c2',
        name: 'Mariane Helena',
        phone: '31989824495',
        phone_masked: '(31) *****-**95',
        has_password: false,
      },
    ]);
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: 'Maria' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));

    await waitFor(() => {
      expect(screen.getByText(/qual é você/i)).toBeInTheDocument();
      expect(screen.getByText('Maria Teste')).toBeInTheDocument();
      expect(screen.getByText('Mariane Helena')).toBeInTheDocument();
    });
  });

  it('mostra erro para entrada que não é celular, nome nem e-mail', async () => {
    renderUniversal();

    fireEvent.change(screen.getByTestId('input-universal'), {
      target: { value: 'abc' },
    });
    fireEvent.click(screen.getByTestId('btn-continuar'));

    await waitFor(() => {
      expect(screen.getByText(/não encontramos ninguém/i)).toBeInTheDocument();
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
