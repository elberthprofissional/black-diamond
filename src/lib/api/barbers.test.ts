import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

const { getBarbers, getBarberByUserId, upsertBarber, deleteBarber } = await import('./barbers');

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

describe('upsertBarber', () => {
  it('cria novo barbeiro', async () => {
    mockRpc.mockResolvedValue({ data: 'new-id-123', error: null });

    const result = await upsertBarber({
      name: 'Novo Barbeiro',
      phone: '11999999999',
      is_active: true,
      is_owner: false,
      sort_order: 1,
    });

    expect(result).toBe('new-id-123');
    expect(mockRpc).toHaveBeenCalledWith('upsert_barber', {
      p_id: null,
      p_user_id: null,
      p_name: 'Novo Barbeiro',
      p_phone: '11999999999',
      p_photo_url: null,
      p_bio: null,
      p_quote: null,
      p_is_active: true,
      p_is_owner: false,
      p_sort_order: 1,
    });
  });

  it('atualiza barbeiro existente com todos os campos', async () => {
    mockRpc.mockResolvedValue({ data: 'b1', error: null });

    const result = await upsertBarber({
      id: 'b1',
      name: 'Atualizado',
      phone: '11988888888',
      photo_url: 'https://example.com/photo.jpg',
      bio: 'Barbeiro experiente',
      quote: 'Cortando desde 2010',
      is_active: true,
      is_owner: true,
      sort_order: 2,
    });

    expect(result).toBe('b1');
    expect(mockRpc).toHaveBeenCalledWith('upsert_barber', {
      p_id: 'b1',
      p_user_id: null,
      p_name: 'Atualizado',
      p_phone: '11988888888',
      p_photo_url: 'https://example.com/photo.jpg',
      p_bio: 'Barbeiro experiente',
      p_quote: 'Cortando desde 2010',
      p_is_active: true,
      p_is_owner: true,
      p_sort_order: 2,
    });
  });

  it('lança erro quando RPC falha', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('Upsert failed') });
    await expect(upsertBarber({ name: 'Teste' })).rejects.toThrow('Upsert failed');
  });
});

describe('deleteBarber', () => {
  it('deleta barbeiro (soft)', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const result = await deleteBarber('b1');
    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('delete_barber', {
      p_barber_id: 'b1',
      p_hard: false,
    });
  });

  it('deleta barbeiro (hard)', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const result = await deleteBarber('b1', true);
    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('delete_barber', {
      p_barber_id: 'b1',
      p_hard: true,
    });
  });

  it('lança erro quando RPC falha', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('Delete failed') });
    await expect(deleteBarber('b1')).rejects.toThrow('Delete failed');
  });
});
