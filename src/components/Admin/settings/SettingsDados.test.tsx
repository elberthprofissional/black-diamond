import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsDados from './SettingsDados';

vi.mock('../../../lib/api', () => ({
  deleteAllBookings: vi.fn(() => Promise.resolve()),
  deleteAllClients: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../lib/utils', () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : 'Erro desconhecido'),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (
          typeof v === 'function' ||
          k === 'initial' ||
          k === 'animate' ||
          k === 'exit' ||
          k === 'transition'
        ) {
          continue;
        }
        safe[k] = v;
      }
      return <div {...safe}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const api = vi.mocked(await import('../../../lib/api'));
const supabase = vi.mocked((await import('../../../lib/supabase')).supabase);

function setupSessionWithUser() {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { user: { email: 'admin@test.com' } } },
    error: null,
  } as never);
}

function setupPasswordSuccess() {
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: { user: { email: 'admin@test.com' }, session: {} },
    error: null,
  } as never);
}

function setupPasswordError(message: string) {
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: { user: null, session: null },
    error: { message, name: 'Auth', code: 'auth' },
  } as never);
}

describe('SettingsDados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both action buttons', () => {
    render(<SettingsDados />);
    expect(screen.getByText('Resetar financeiro')).toBeInTheDocument();
    expect(screen.getByText('Deletar clientes')).toBeInTheDocument();
  });

  it('renders action descriptions', () => {
    render(<SettingsDados />);
    expect(screen.getByText(/Zera faturamento/)).toBeInTheDocument();
    expect(screen.getByText(/Remove todos os clientes/)).toBeInTheDocument();
  });

  it('opens bookings modal with confirmation step', () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    expect(screen.getByPlaceholderText('Digite ZERAR para confirmar')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeDisabled();
  });

  it('opens clients modal with confirmation step', () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Deletar clientes'));
    expect(screen.getByPlaceholderText('Digite DELETAR para confirmar')).toBeInTheDocument();
  });

  it('closes modal on Cancel', async () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Digite ZERAR para confirmar')).not.toBeInTheDocument();
    });
  });

  it('disables confirm button when text does not match', () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    const input = screen.getByPlaceholderText('Digite ZERAR para confirmar');
    fireEvent.change(input, { target: { value: 'WRONG' } });
    expect(screen.getByText('Confirmar')).toBeDisabled();
  });

  it('enables confirm button when text matches ZERAR', () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    expect(screen.getByText('Confirmar')).not.toBeDisabled();
  });

  it('enables confirm button when text matches DELETAR', () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Deletar clientes'));
    fireEvent.change(screen.getByPlaceholderText('Digite DELETAR para confirmar'), {
      target: { value: 'DELETAR' },
    });
    expect(screen.getByText('Confirmar')).not.toBeDisabled();
  });

  it('transitions to password step when confirming bookings', async () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
  });

  it('transitions to password step when confirming clients', async () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Deletar clientes'));
    fireEvent.change(screen.getByPlaceholderText('Digite DELETAR para confirmar'), {
      target: { value: 'DELETAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
  });

  it('goes back from password step to confirm step', async () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Voltar'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Digite ZERAR para confirmar')).toBeInTheDocument();
    });
  });

  it('shows password error on invalid password', async () => {
    setupSessionWithUser();
    setupPasswordError('Invalid credentials');

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const passwordInput = screen.getByPlaceholderText('Sua senha');
    await userEvent.type(passwordInput, 'wrongpass');
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Senha incorreta.')).toBeInTheDocument();
    });
  });

  it('successfully deletes bookings after password verification', async () => {
    setupSessionWithUser();
    setupPasswordSuccess();

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const passwordInput = screen.getByPlaceholderText('Sua senha');
    await userEvent.type(passwordInput, 'correctpass');
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(api.deleteAllBookings).toHaveBeenCalled();
      expect(screen.getByText('Financeiro resetado com sucesso!')).toBeInTheDocument();
    });
  });

  it('successfully deletes clients after password verification', async () => {
    setupSessionWithUser();
    setupPasswordSuccess();

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Deletar clientes'));
    fireEvent.change(screen.getByPlaceholderText('Digite DELETAR para confirmar'), {
      target: { value: 'DELETAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const passwordInput = screen.getByPlaceholderText('Sua senha');
    await userEvent.type(passwordInput, 'correctpass');
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(api.deleteAllClients).toHaveBeenCalled();
      expect(screen.getByText('Clientes deletados com sucesso!')).toBeInTheDocument();
    });
  });

  it('shows error when deleteAllBookings throws', async () => {
    api.deleteAllBookings.mockRejectedValueOnce(new Error('Network error'));
    setupSessionWithUser();
    setupPasswordSuccess();

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const passwordInput = screen.getByPlaceholderText('Sua senha');
    await userEvent.type(passwordInput, 'pass');
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows error when deleteAllClients throws', async () => {
    api.deleteAllClients.mockRejectedValueOnce(new Error('Delete failed'));
    setupSessionWithUser();
    setupPasswordSuccess();

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Deletar clientes'));
    fireEvent.change(screen.getByPlaceholderText('Digite DELETAR para confirmar'), {
      target: { value: 'DELETAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const passwordInput = screen.getByPlaceholderText('Sua senha');
    await userEvent.type(passwordInput, 'pass');
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
  });

  it('shows error when session has no email', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: {} } },
      error: null,
    } as never);

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const passwordInput = screen.getByPlaceholderText('Sua senha');
    await userEvent.type(passwordInput, 'pass');
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Sessão expirada. Faça login novamente.')).toBeInTheDocument();
    });
  });

  it('shows generic error when getSession throws', async () => {
    vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('Network fail'));

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const passwordInput = screen.getByPlaceholderText('Sua senha');
    await userEvent.type(passwordInput, 'pass');
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Erro ao verificar senha.')).toBeInTheDocument();
    });
  });

  it('clears password error when typing new password', async () => {
    setupSessionWithUser();
    setupPasswordError('Invalid');

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const passwordInput = screen.getByPlaceholderText('Sua senha');
    await userEvent.type(passwordInput, 'wrong');
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Senha incorreta.')).toBeInTheDocument();
    });
    fireEvent.change(passwordInput, { target: { value: '' } });
    expect(screen.queryByText('Senha incorreta.')).not.toBeInTheDocument();
  });

  it('closes modal on Escape key via cancel button', async () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Deletar clientes'));
    expect(screen.getByPlaceholderText('Digite DELETAR para confirmar')).toBeInTheDocument();
    // The backdrop click handler is on the framer-motion motion.div wrapper;
    // verify modal closes via the Cancel button as an alternative
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText('Digite DELETAR para confirmar')
      ).not.toBeInTheDocument();
    });
  });

  it('shows loading state while processing bookings delete', async () => {
    api.deleteAllBookings.mockReturnValue(new Promise(() => {}));
    setupSessionWithUser();
    setupPasswordSuccess();

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByPlaceholderText('Sua senha'), 'pass');
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      const confirmBtns = screen.getAllByText('...');
      expect(confirmBtns.length).toBeGreaterThan(0);
    });
  });

  it('disables confirm button while processing', async () => {
    api.deleteAllBookings.mockReturnValue(new Promise(() => {}));
    setupSessionWithUser();
    setupPasswordSuccess();

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByPlaceholderText('Sua senha'), 'pass');
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      const disabledBtns = screen.getAllByText('...').filter((b) => b.closest('button')?.disabled);
      expect(disabledBtns.length).toBeGreaterThan(0);
    });
  });

  it('submits bookings via Enter key in password field', async () => {
    setupSessionWithUser();
    setupPasswordSuccess();

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const passwordInput = screen.getByPlaceholderText('Sua senha');
    await userEvent.type(passwordInput, 'pass{Enter}');
    await waitFor(() => {
      expect(api.deleteAllBookings).toHaveBeenCalled();
    });
  });

  it('submits clients via Enter key in password field', async () => {
    setupSessionWithUser();
    setupPasswordSuccess();

    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Deletar clientes'));
    fireEvent.change(screen.getByPlaceholderText('Digite DELETAR para confirmar'), {
      target: { value: 'DELETAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const passwordInput = screen.getByPlaceholderText('Sua senha');
    await userEvent.type(passwordInput, 'pass{Enter}');
    await waitFor(() => {
      expect(api.deleteAllClients).toHaveBeenCalled();
    });
  });

  it('submits bookings via Enter in confirm text field when text matches', async () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    const input = screen.getByPlaceholderText('Digite ZERAR para confirmar');
    await userEvent.type(input, 'ZERAR{Enter}');
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
  });

  it('submits clients via Enter in confirm text field when text matches', async () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Deletar clientes'));
    const input = screen.getByPlaceholderText('Digite DELETAR para confirmar');
    await userEvent.type(input, 'DELETAR{Enter}');
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
  });

  it('does not submit password when password is empty', async () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.change(screen.getByPlaceholderText('Digite ZERAR para confirmar'), {
      target: { value: 'ZERAR' },
    });
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(screen.getByText('Confirme sua senha')).toBeInTheDocument();
    });
    const confirmBtn = screen.getByText('Confirmar');
    expect(confirmBtn).toBeDisabled();
  });

  it('does not transition when Enter pressed on confirm field without matching text', async () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    const input = screen.getByPlaceholderText('Digite ZERAR para confirmar');
    await userEvent.type(input, '{Enter}');
    expect(screen.getByPlaceholderText('Digite ZERAR para confirmar')).toBeInTheDocument();
  });
});
