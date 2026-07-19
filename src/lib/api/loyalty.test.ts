import { describe, it, expect, vi, beforeEach } from 'vitest';

let queryResult: { data: unknown; error: unknown; count?: number } = {
  data: null,
  error: null,
  count: 0,
};
const mockFrom = vi.fn();
const mockRpc = vi.fn();

function createQueryBuilder() {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
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
  getMilestones,
  saveMilestones,
  setLoyaltyEnabled,
  getClientMilestones,
  claimMilestone,
  getClientMilestonesPublic,
} = await import('./loyalty');

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: null, error: null, count: 0 };
  mockFrom.mockImplementation(() => createQueryBuilder());
  mockRpc.mockResolvedValue({ data: null, error: null });
});

describe('getMilestones', () => {
  it('retorna milestones ordenadas por visits_required', async () => {
    queryResult = {
      data: [
        { id: 'm1', visits_required: 5, reward_service_id: 's1', is_active: true },
        { id: 'm2', visits_required: 10, reward_service_id: 's2', is_active: true },
      ],
      error: null,
    };
    const result = await getMilestones();
    expect(result).toHaveLength(2);
    expect(result[0].visits_required).toBe(5);
  });

  it('retorna array vazio quando não há milestones', async () => {
    queryResult = { data: [], error: null };
    const result = await getMilestones();
    expect(result).toEqual([]);
  });

  it('lança erro quando supabase retorna erro', async () => {
    queryResult = { data: null, error: new Error('DB error') };
    await expect(getMilestones()).rejects.toThrow('DB error');
  });
});

describe('saveMilestones', () => {
  it('deleta todas as existentes e insere novas', async () => {
    const deleteBuilder = createQueryBuilder();
    const insertBuilder = createQueryBuilder();
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? deleteBuilder : insertBuilder;
    });

    await saveMilestones([{ visits_required: 5, reward_service_id: 's1' }]);

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(insertBuilder.insert).toHaveBeenCalledWith([
      { visits_required: 5, reward_service_id: 's1' },
    ]);
  });

  it('não insere quando lista está vazia', async () => {
    const deleteBuilder = createQueryBuilder();
    const insertBuilder = createQueryBuilder();
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? deleteBuilder : insertBuilder;
    });

    await saveMilestones([]);

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(insertBuilder.insert).not.toHaveBeenCalled();
  });
});

describe('setLoyaltyEnabled', () => {
  it('desativa milestones quando desabilita (soft-delete)', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await setLoyaltyEnabled(false);

    expect(builder.update).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('reativa milestones quando habilita', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await setLoyaltyEnabled(true);

    expect(builder.update).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('is_active', false);
  });
});

describe('getClientMilestones', () => {
  it('retorna milestones com progresso do cliente', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const builder = createQueryBuilder();
      if (callCount === 1) {
        // milestones query
        builder.then = vi.fn((resolve: (v: unknown) => void) =>
          resolve({
            data: [{ id: 'm1', visits_required: 5, reward_service_id: 's1', is_active: true }],
            error: null,
          })
        );
      } else if (callCount === 2) {
        // client visits query
        builder.single = vi.fn().mockResolvedValue({
          data: { historical_visits: 3 },
          error: null,
        });
      } else {
        // claimed milestones query
        builder.then = vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null }));
      }
      return builder;
    });

    const result = await getClientMilestones('client-1');
    expect(result).toHaveLength(1);
    expect(result[0].progress).toBe(3);
    expect(result[0].already_claimed).toBe(false);
  });

  it('retorna array vazio quando não há milestones', async () => {
    const builder = createQueryBuilder();
    builder.then = vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null }));
    mockFrom.mockReturnValue(builder);

    const result = await getClientMilestones('client-1');
    expect(result).toEqual([]);
  });
});

describe('claimMilestone', () => {
  it('insere registro de milestone resgatada', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await claimMilestone('client-1', 'milestone-1');

    expect(builder.insert).toHaveBeenCalledWith({
      client_id: 'client-1',
      milestone_id: 'milestone-1',
    });
  });

  it('ignora erro de unique violation (já resgatou)', async () => {
    const builder = createQueryBuilder();
    builder.insert = vi.fn().mockResolvedValue({
      error: { code: '23505' },
    });
    mockFrom.mockReturnValue(builder);

    // Não deve lançar erro
    await expect(claimMilestone('client-1', 'milestone-1')).resolves.toBeUndefined();
  });
});

describe('getClientMilestonesPublic', () => {
  it('retorna milestones via RPC', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          milestone: { id: 'm1', visits_required: 5, reward_service_id: 's1' },
          progress: 3,
          already_claimed: false,
        },
      ],
      error: null,
    });

    const result = await getClientMilestonesPublic('client-1');
    expect(result).toHaveLength(1);
    expect(result[0].progress).toBe(3);
  });

  it('retorna array vazio quando RPC retorna erro', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC error') });
    const result = await getClientMilestonesPublic('client-1');
    expect(result).toEqual([]);
  });

  it('retorna array vazio quando dados são null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await getClientMilestonesPublic('client-1');
    expect(result).toEqual([]);
  });
});
