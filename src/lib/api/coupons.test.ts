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
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
    then: vi.fn((resolve: (v: unknown) => void) => resolve(queryResult)),
  };
}

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

const { getCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon, applyCoupon } =
  await import('./coupons');

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: null, error: null, count: 0 };
  mockFrom.mockImplementation(() => createQueryBuilder());
  mockRpc.mockResolvedValue({ data: null, error: null });
});

describe('getCoupons', () => {
  it('retorna lista de cupons', async () => {
    queryResult = {
      data: [
        { id: 'c1', code: 'DESCONTO10', discount_type: 'percentage', discount_value: 10 },
        { id: 'c2', code: 'FIXO20', discount_type: 'fixed', discount_value: 20 },
      ],
      error: null,
    };
    const result = await getCoupons();
    expect(result).toHaveLength(2);
    expect(result[0].code).toBe('DESCONTO10');
  });

  it('retorna array vazio quando não há cupons', async () => {
    queryResult = { data: [], error: null };
    const result = await getCoupons();
    expect(result).toEqual([]);
  });

  it('lança erro quando supabase retorna erro', async () => {
    queryResult = { data: null, error: new Error('DB error') };
    await expect(getCoupons()).rejects.toThrow('DB error');
  });
});

describe('createCoupon', () => {
  it('cria cupom com código em uppercase', async () => {
    const builder = createQueryBuilder();
    builder.single = vi.fn().mockResolvedValue({
      data: {
        id: 'c1',
        code: 'DESCONTO10',
        discount_type: 'percentage',
        discount_value: 10,
      },
      error: null,
    });
    mockFrom.mockReturnValue(builder);

    const result = await createCoupon({
      code: 'desconto10',
      description: '10% off',
      discount_type: 'percentage',
      discount_value: 10,
      valid_from: '2026-01-01',
      valid_until: null,
      max_uses: null,
      is_active: true,
      applicable_service_ids: [],
    });

    expect(builder.insert).toHaveBeenCalled();
    expect(result.code).toBe('DESCONTO10');
  });

  it('lança erro quando supabase retorna erro', async () => {
    const builder = createQueryBuilder();
    builder.single = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Duplicate code'),
    });
    mockFrom.mockReturnValue(builder);

    await expect(
      createCoupon({
        code: 'EXISTING',
        description: '',
        discount_type: 'fixed',
        discount_value: 10,
        valid_from: '2026-01-01',
        valid_until: null,
        max_uses: null,
        is_active: true,
        applicable_service_ids: [],
      })
    ).rejects.toThrow('Duplicate code');
  });
});

describe('updateCoupon', () => {
  it('atualiza cupom existente', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await updateCoupon('c1', { code: 'NOVO', discount_value: 15 });

    expect(builder.update).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1');
  });

  it('lança erro quando supabase retorna erro', async () => {
    const builder = createQueryBuilder();
    builder.update = vi.fn().mockReturnThis();
    builder.eq = vi.fn().mockResolvedValue({ error: new Error('Not found') });
    mockFrom.mockReturnValue(builder);

    await expect(updateCoupon('c1', { code: 'NOVO' })).rejects.toThrow();
  });
});

describe('deleteCoupon', () => {
  it('deleta cupom por id', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await deleteCoupon('c1');

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1');
  });
});

describe('validateCoupon', () => {
  it('retorna válido quando cupom é aceito', async () => {
    mockRpc.mockResolvedValue({
      data: {
        valid: true,
        coupon_id: 'c1',
        code: 'DESCONTO10',
        discount_type: 'percentage',
        discount_amount: 5,
        original_price: 50,
      },
      error: null,
    });

    const result = await validateCoupon('DESCONTO10', ['s1']);
    expect(result.valid).toBe(true);
    expect(result.discount_amount).toBe(5);
  });

  it('retorna inválido quando cupom não existe', async () => {
    mockRpc.mockResolvedValue({
      data: { valid: false, error: 'Cupom não encontrado' },
      error: null,
    });

    const result = await validateCoupon('INEXISTENTE', ['s1']);
    expect(result.valid).toBe(false);
  });

  it('retorna erro quando RPC falha', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC error') });

    const result = await validateCoupon('TEST', ['s1']);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Erro ao validar cupom.');
  });
});

describe('applyCoupon', () => {
  it('chama RPC apply_coupon', async () => {
    mockRpc.mockResolvedValue({ error: null });

    await applyCoupon('coupon-1');

    expect(mockRpc).toHaveBeenCalledWith('apply_coupon', { p_coupon_id: 'coupon-1' });
  });

  it('lança erro quando RPC falha', async () => {
    mockRpc.mockResolvedValue({ error: new Error('Not found') });

    await expect(applyCoupon('invalid-id')).rejects.toThrow('Not found');
  });
});
