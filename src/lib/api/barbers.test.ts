import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

const { getBarbers, getBarberByUserId } = await import('./barbers');

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ data: null, error: null });
});

describe('getBarbers', () => {
  it('retorna lista de barbeiros', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { id: 'b1', name: 'Barbeiro 1', is_active: true },
        { id: 'b2', name: 'Barbeiro 2', is_active: true },
      ],
      error: null,
    });

    const result = await getBarbers();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Barbeiro 1');
    expect(mockRpc).toHaveBeenCalledWith('get_barbers');
  });

  it('retorna array vazio quando não há dados', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await getBarbers();
    expect(result).toEqual([]);
  });

  it('lança erro quando RPC falha', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC error') });
    await expect(getBarbers()).rejects.toThrow('RPC error');
  });
});

describe('getBarberByUserId', () => {
  it('retorna barbeiro quando encontrado', async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 'b1', name: 'Barbeiro 1', user_id: 'u1' }],
      error: null,
    });

    const result = await getBarberByUserId('u1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('b1');
    expect(mockRpc).toHaveBeenCalledWith('get_barber_by_user_id', { p_user_id: 'u1' });
  });

  it('retorna null quando barbeiro não encontrado', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await getBarberByUserId('inexistente');
    expect(result).toBeNull();
  });

  it('retorna null quando array vazio', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const result = await getBarberByUserId('u1');
    expect(result).toBeNull();
  });

  it('lança erro quando RPC falha', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('Not found') });
    await expect(getBarberByUserId('u1')).rejects.toThrow('Not found');
  });
});
