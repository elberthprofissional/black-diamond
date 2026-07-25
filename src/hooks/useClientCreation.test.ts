import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockCreateClient = vi.fn();
const mockShowSuccess = vi.fn();
const mockLog = vi.fn();
const mockLoadData = vi.fn().mockResolvedValue(undefined);

// Configurable chain: each from() call gets a fresh chain controlled by _fromCalls
interface ChainCall {
  maybeSingleResult?: unknown;
  updateResult?: unknown;
  updateError?: unknown;
}

let _fromCalls: ChainCall[] = [];

function buildChain(call: ChainCall) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'ilike', 'is', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(call.maybeSingleResult ?? { data: null, error: null })
    );
  // update returns the chain so .eq() can be called on it
  chain.update = vi.fn().mockReturnValue(chain);
  // then resolves with updateResult for the update path
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => {
    const result = call.updateResult ?? call.maybeSingleResult ?? { data: null, error: null };
    return Promise.resolve(result).then(resolve);
  });
  return chain;
}

const mockFrom = vi.fn();

vi.mock('../lib/api', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getSession: vi.fn() },
  },
}));

vi.mock('../lib/utils', () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

vi.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: vi.fn(),
  }),
}));

vi.mock('./useAuditLog', () => ({
  useAuditLog: () => ({
    log: mockLog,
  }),
}));

import { useClientCreation } from './useClientCreation';

describe('useClientCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadData.mockResolvedValue(undefined);
    _fromCalls = [];
    // Default: all from() calls return null data
    mockFrom.mockImplementation(() => buildChain({}));
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useClientCreation(mockLoadData));
    expect(result.current.isSavingClient).toBe(false);
    expect(result.current.newClientError).toBe('');
    expect(result.current.newClientName).toBe('');
    expect(result.current.newClientPhone).toBe('');
  });

  it('does nothing when name is empty', async () => {
    const { result } = renderHook(() => useClientCreation(mockLoadData));
    act(() => {
      result.current.setNewClientName('');
      result.current.setNewClientPhone('11999999999');
    });
    await act(async () => {
      await result.current.handleCreateClient();
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('does nothing when phone is empty', async () => {
    const { result } = renderHook(() => useClientCreation(mockLoadData));
    act(() => {
      result.current.setNewClientName('João');
      result.current.setNewClientPhone('');
    });
    await act(async () => {
      await result.current.handleCreateClient();
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('creates client successfully', async () => {
    mockCreateClient.mockResolvedValue({ id: 'new-1' });
    const { result } = renderHook(() => useClientCreation(mockLoadData));

    act(() => {
      result.current.setNewClientName('João');
      result.current.setNewClientPhone('11999999999');
      result.current.setNewClientEmail('joao@test.com');
      result.current.setNewClientNotes('VIP');
    });

    await act(async () => {
      await result.current.handleCreateClient();
    });

    expect(mockCreateClient).toHaveBeenCalledWith({
      name: 'João',
      phone: '11999999999',
      email: 'joao@test.com',
      notes: 'VIP',
      manually_added: true,
    });
    expect(mockShowSuccess).toHaveBeenCalledWith('Cliente criado com sucesso!');
    expect(mockLoadData).toHaveBeenCalled();
    expect(result.current.newClientName).toBe('');
  });

  it('handles duplicate phone that was manually added', async () => {
    _fromCalls = [
      {
        maybeSingleResult: {
          data: { id: 'existing-1', name: 'Maria', manually_added: true },
          error: null,
        },
      },
    ];
    mockFrom.mockImplementation(() => buildChain(_fromCalls.shift()!));

    const { result } = renderHook(() => useClientCreation(mockLoadData));

    act(() => {
      result.current.setNewClientName('Maria');
      result.current.setNewClientPhone('11988888888');
    });

    await act(async () => {
      await result.current.handleCreateClient();
    });

    expect(result.current.newClientError).toBe('Este telefone já está cadastrado para "Maria".');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('handles duplicate phone that was NOT manually added — marks it and succeeds', async () => {
    _fromCalls = [
      // Call 1: phone check — exists but not manually_added
      {
        maybeSingleResult: {
          data: { id: 'existing-2', name: 'Carlos', manually_added: false },
          error: null,
        },
      },
      // Call 2: update chain — update succeeds, then resolves with no error
      { updateResult: { error: null } },
    ];
    mockFrom.mockImplementation(() => buildChain(_fromCalls.shift()!));

    const { result } = renderHook(() => useClientCreation(mockLoadData));

    act(() => {
      result.current.setNewClientName('Carlos');
      result.current.setNewClientPhone('11977777777');
    });

    await act(async () => {
      await result.current.handleCreateClient();
    });

    expect(mockShowSuccess).toHaveBeenCalledWith('Carlos adicionado com sucesso!');
    expect(mockLoadData).toHaveBeenCalled();
    expect(result.current.newClientError).toBe('');
  });

  it('handles update error when marking non-manually-added phone', async () => {
    _fromCalls = [
      // Call 1: phone check — exists but not manually_added
      {
        maybeSingleResult: {
          data: { id: 'existing-3', name: 'Ana', manually_added: false },
          error: null,
        },
      },
      // Call 2: update fails — getErrorMessage expects an Error instance
      { updateResult: { error: new Error('Update failed') } },
    ];
    mockFrom.mockImplementation(() => buildChain(_fromCalls.shift()!));

    const { result } = renderHook(() => useClientCreation(mockLoadData));

    act(() => {
      result.current.setNewClientName('Ana');
      result.current.setNewClientPhone('11966666666');
    });

    await act(async () => {
      await result.current.handleCreateClient();
    });

    expect(result.current.newClientError).toBe('Update failed');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('handles duplicate name', async () => {
    _fromCalls = [
      // Call 1: phone check — not found
      { maybeSingleResult: { data: null, error: null } },
      // Call 2: name check — found
      { maybeSingleResult: { data: { id: 'name-dup' }, error: null } },
    ];
    mockFrom.mockImplementation(() => buildChain(_fromCalls.shift()!));

    const { result } = renderHook(() => useClientCreation(mockLoadData));

    act(() => {
      result.current.setNewClientName('Pedro');
      result.current.setNewClientPhone('11955555555');
    });

    await act(async () => {
      await result.current.handleCreateClient();
    });

    expect(result.current.newClientError).toBe('Este nome já está sendo usado por outro cliente.');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('handles general error in try/catch', async () => {
    mockCreateClient.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useClientCreation(mockLoadData));

    act(() => {
      result.current.setNewClientName('Test');
      result.current.setNewClientPhone('11944444444');
    });

    await act(async () => {
      await result.current.handleCreateClient();
    });

    expect(result.current.newClientError).toBe('Network error');
  });

  it('resetNewClientForm clears all fields', () => {
    const { result } = renderHook(() => useClientCreation(mockLoadData));

    act(() => {
      result.current.setNewClientName('Test');
      result.current.setNewClientPhone('11999999999');
      result.current.setNewClientEmail('test@test.com');
      result.current.setNewClientNotes('note');
    });

    act(() => {
      result.current.resetNewClientForm();
    });

    expect(result.current.newClientName).toBe('');
    expect(result.current.newClientPhone).toBe('');
    expect(result.current.newClientEmail).toBe('');
    expect(result.current.newClientNotes).toBe('');
  });

  it('creates client with empty optional fields', async () => {
    mockCreateClient.mockResolvedValue({ id: 'new-2' });
    const { result } = renderHook(() => useClientCreation(mockLoadData));

    act(() => {
      result.current.setNewClientName('  Ana  ');
      result.current.setNewClientPhone('  11933333333  ');
    });

    await act(async () => {
      await result.current.handleCreateClient();
    });

    expect(mockCreateClient).toHaveBeenCalledWith({
      name: 'Ana',
      phone: '11933333333',
      email: undefined,
      notes: undefined,
      manually_added: true,
    });
  });
});
