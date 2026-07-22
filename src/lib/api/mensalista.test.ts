import { describe, it, expect, vi, beforeEach } from 'vitest';

let queryResult: { data: unknown; error: unknown } = { data: null, error: null };

const mockFrom = vi.fn();
const mockRpc = vi.fn();

function createQueryBuilder() {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
    then: vi.fn((resolve: (v: unknown) => void) => resolve(queryResult)),
  };
}

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

const {
  getMensalistaPlans,
  createMensalistaPlan,
  updateMensalistaPlan,
  deleteMensalistaPlan,
  getMensalistaEnabled,
  setMensalistaEnabled,
} = await import('./mensalista');

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: null, error: null };
  mockFrom.mockImplementation(() => createQueryBuilder());
  mockRpc.mockResolvedValue({ data: null, error: null });
});

describe('getMensalistaPlans', () => {
  it('retorna lista de planos', async () => {
    queryResult = {
      data: [
        { id: 'p1', name: 'Plano Black', price: 150, is_active: true, sort_order: 1 },
        { id: 'p2', name: 'Plano Gold', price: 120, is_active: true, sort_order: 2 },
      ],
      error: null,
    };

    const result = await getMensalistaPlans();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Plano Black');
    expect(result[1].name).toBe('Plano Gold');
  });

  it('filtra apenas ativos quando activeOnly=true', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await getMensalistaPlans(true);

    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('retorna array vazio quando não há planos', async () => {
    queryResult = { data: [], error: null };

    const result = await getMensalistaPlans();
    expect(result).toEqual([]);
  });

  it('lança erro quando supabase retorna erro', async () => {
    queryResult = { data: null, error: new Error('DB error') };

    await expect(getMensalistaPlans()).rejects.toThrow('DB error');
  });

  it('ordena por sort_order ascendente', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await getMensalistaPlans();

    expect(builder.order).toHaveBeenCalledWith('sort_order', { ascending: true });
  });
});

describe('createMensalistaPlan', () => {
  it('cria plano com dados corretos', async () => {
    const builder = createQueryBuilder();
    builder.single = vi.fn().mockResolvedValue({
      data: { id: 'p1', name: 'Plano Black', price: 150 },
      error: null,
    });
    mockFrom.mockReturnValue(builder);

    const result = await createMensalistaPlan({
      name: 'Plano Black',
      price: 150,
      included_service_ids: ['s1', 's2'],
      allowed_days: [1, 2, 3, 4, 5],
    });

    expect(builder.insert).toHaveBeenCalledWith({
      name: 'Plano Black',
      price: 150,
      included_service_ids: ['s1', 's2'],
      allowed_days: [1, 2, 3, 4, 5],
      is_active: true,
    });
    expect(result.id).toBe('p1');
  });

  it('cria plano com is_active false quando especificado', async () => {
    const builder = createQueryBuilder();
    builder.single = vi.fn().mockResolvedValue({ data: {}, error: null });
    mockFrom.mockReturnValue(builder);

    await createMensalistaPlan({
      name: 'Plano Teste',
      price: 100,
      included_service_ids: [],
      allowed_days: [1],
      is_active: false,
    });

    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
  });

  it('lança erro quando insert falha', async () => {
    const builder = createQueryBuilder();
    builder.single = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Insert failed'),
    });
    mockFrom.mockReturnValue(builder);

    await expect(
      createMensalistaPlan({
        name: 'Falho',
        price: 0,
        included_service_ids: [],
        allowed_days: [1],
      })
    ).rejects.toThrow('Insert failed');
  });
});

describe('updateMensalistaPlan', () => {
  it('atualiza plano existente', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await updateMensalistaPlan('p1', { name: 'Novo Nome', price: 200 });

    expect(builder.update).toHaveBeenCalledWith({ name: 'Novo Nome', price: 200 });
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('lança erro quando update falha', async () => {
    const builder = createQueryBuilder();
    builder.update = vi.fn().mockReturnThis();
    builder.eq = vi.fn().mockResolvedValue({ error: new Error('Not found') });
    mockFrom.mockReturnValue(builder);

    await expect(updateMensalistaPlan('invalid', { name: 'X' })).rejects.toThrow();
  });

  it('atualiza apenas campos fornecidos', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await updateMensalistaPlan('p1', { sort_order: 3 });

    expect(builder.update).toHaveBeenCalledWith({ sort_order: 3 });
  });
});

describe('deleteMensalistaPlan', () => {
  it('deleta plano por id', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await deleteMensalistaPlan('p1');

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('lança erro quando delete falha', async () => {
    const builder = createQueryBuilder();
    builder.delete = vi.fn().mockReturnThis();
    builder.eq = vi.fn().mockResolvedValue({ error: new Error('Delete failed') });
    mockFrom.mockReturnValue(builder);

    await expect(deleteMensalistaPlan('invalid')).rejects.toThrow();
  });
});

describe('getMensalistaEnabled', () => {
  it('retorna true quando config é "true"', async () => {
    const builder = createQueryBuilder();
    builder.maybeSingle = vi.fn().mockResolvedValue({
      data: { value: 'true' },
      error: null,
    });
    mockFrom.mockReturnValue(builder);

    const result = await getMensalistaEnabled();
    expect(result).toBe(true);
  });

  it('retorna false quando config é "false"', async () => {
    const builder = createQueryBuilder();
    builder.maybeSingle = vi.fn().mockResolvedValue({
      data: { value: 'false' },
      error: null,
    });
    mockFrom.mockReturnValue(builder);

    const result = await getMensalistaEnabled();
    expect(result).toBe(false);
  });

  it('retorna false quando não há config', async () => {
    const builder = createQueryBuilder();
    builder.maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    mockFrom.mockReturnValue(builder);

    const result = await getMensalistaEnabled();
    expect(result).toBe(false);
  });

  it('lança erro quando query falha', async () => {
    const builder = createQueryBuilder();
    builder.maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Query failed'),
    });
    mockFrom.mockReturnValue(builder);

    await expect(getMensalistaEnabled()).rejects.toThrow('Query failed');
  });
});

describe('setMensalistaEnabled', () => {
  it('salva config como "true"', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await setMensalistaEnabled(true);

    expect(builder.upsert).toHaveBeenCalledWith(
      { key: 'mensalista_enabled', value: 'true' },
      { onConflict: 'key' }
    );
  });

  it('salva config como "false"', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await setMensalistaEnabled(false);

    expect(builder.upsert).toHaveBeenCalledWith(
      { key: 'mensalista_enabled', value: 'false' },
      { onConflict: 'key' }
    );
  });

  it('lança erro quando upsert falha', async () => {
    const builder = createQueryBuilder();
    builder.upsert = vi.fn().mockResolvedValue({ error: new Error('Upsert failed') });
    mockFrom.mockReturnValue(builder);

    await expect(setMensalistaEnabled(true)).rejects.toThrow('Upsert failed');
  });
});
