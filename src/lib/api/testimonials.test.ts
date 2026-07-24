import { describe, it, expect, vi, beforeEach } from 'vitest';

let queryResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
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
    not: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
    then: vi.fn((resolve: (v: unknown) => void) => resolve(queryResult)),
  };
}

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getSession: vi.fn(),
    },
  },
}));

const {
  getActiveTestimonials,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = await import('./testimonials');

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: null, error: null };
  mockFrom.mockImplementation(() => createQueryBuilder());
  mockRpc.mockResolvedValue({ data: null, error: null });
});

describe('getActiveTestimonials', () => {
  it('retorna depoimentos ativos ordenados por publish_time', async () => {
    queryResult = {
      data: [
        { id: 't1', name: 'João', rating: 5, text: 'Excelente!', is_active: true },
        { id: 't2', name: 'Maria', rating: 4, text: 'Muito bom!', is_active: true },
      ],
      error: null,
    };
    const result = await getActiveTestimonials();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('João');
  });

  it('retorna array vazio quando não há depoimentos ativos', async () => {
    queryResult = { data: [], error: null };
    const result = await getActiveTestimonials();
    expect(result).toEqual([]);
  });

  it('retorna array vazio quando supabase retorna erro (anti-burro)', async () => {
    queryResult = { data: null, error: new Error('DB error') };
    const result = await getActiveTestimonials();
    expect(result).toEqual([]);
  });

  it('filtra depoimentos inválidos (sem texto/rating) e retorna só os válidos', async () => {
    queryResult = {
      data: [
        { id: 't1', name: 'João', rating: 5, text: 'Excelente!', is_active: true },
        { id: 't2', name: '', rating: 3, text: 'Sem nome', is_active: true },
        { id: 't3', name: 'Teste', rating: 0, text: 'Rating inválido', is_active: true },
        { id: 't4', name: 'Vazio', rating: 4, text: '  ', is_active: true },
      ],
      error: null,
    };
    const result = await getActiveTestimonials();
    expect(mockFrom).toHaveBeenCalledWith('testimonials');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('João');
  });

  it('retorna array vazio se todos os depoimentos forem inválidos', async () => {
    queryResult = {
      data: [
        { id: 't1', name: '', rating: 5, text: 'Sem nome', is_active: true },
        { id: 't2', name: 'Vazio', rating: 0, text: 'Rating', is_active: true },
      ],
      error: null,
    };
    const result = await getActiveTestimonials();
    expect(result).toEqual([]);
  });
});

describe('getAllTestimonials', () => {
  it('retorna todos os depoimentos (ativos e inativos)', async () => {
    queryResult = {
      data: [
        { id: 't1', name: 'João', is_active: true },
        { id: 't2', name: 'Maria', is_active: false },
      ],
      error: null,
    };
    const result = await getAllTestimonials();
    expect(result).toHaveLength(2);
  });

  it('lança erro quando supabase retorna erro', async () => {
    queryResult = { data: null, error: new Error('DB error') };
    await expect(getAllTestimonials()).rejects.toThrow('DB error');
  });
});

describe('createTestimonial', () => {
  it('cria novo depoimento com name, rating e text', async () => {
    const builder = createQueryBuilder();
    builder.single = vi.fn().mockResolvedValue({
      data: { id: 't1', name: 'João', rating: 5, text: 'Ótimo!' },
      error: null,
    });
    mockFrom.mockReturnValue(builder);

    const result = await createTestimonial({ name: 'João', rating: 5, text: 'Ótimo!' });
    expect(result.id).toBe('t1');
    expect(result.name).toBe('João');
  });

  it('lança erro quando insert falha', async () => {
    const builder = createQueryBuilder();
    builder.single = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Insert failed'),
    });
    mockFrom.mockReturnValue(builder);

    await expect(
      createTestimonial({ name: 'João', rating: 5, text: 'Teste' })
    ).rejects.toThrow('Insert failed');
  });
});

describe('updateTestimonial', () => {
  it('atualiza campos do depoimento', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await updateTestimonial('t1', { is_active: false, sort_order: 1 });
    expect(builder.update).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 't1');
  });

  it('lança erro quando update falha', async () => {
    const builder = createQueryBuilder();
    builder.update = vi.fn().mockReturnThis();
    builder.eq = vi.fn().mockResolvedValue({ error: new Error('Update failed') });
    mockFrom.mockReturnValue(builder);

    await expect(updateTestimonial('t1', { name: 'Novo' })).rejects.toThrow();
  });
});

describe('deleteTestimonial', () => {
  it('deleta depoimento por id', async () => {
    const builder = createQueryBuilder();
    mockFrom.mockReturnValue(builder);

    await deleteTestimonial('t1');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 't1');
  });

  it('lança erro quando delete falha', async () => {
    const builder = createQueryBuilder();
    builder.delete = vi.fn().mockReturnThis();
    builder.eq = vi.fn().mockResolvedValue({ error: new Error('Delete failed') });
    mockFrom.mockReturnValue(builder);

    await expect(deleteTestimonial('t1')).rejects.toThrow();
  });
});

