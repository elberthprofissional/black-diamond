import { describe, it, expect, vi, beforeEach } from 'vitest';

let queryResult: { data: unknown; error: unknown } = { data: [], error: null };
const mockRpc = vi.fn();
const mockFrom = vi.fn();

function createQueryBuilder() {
  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
    then: vi.fn((resolve: (v: unknown) => void) => resolve(queryResult)),
  };
  return builder;
}

let queryBuilder = createQueryBuilder();

vi.mock('./supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

mockFrom.mockImplementation(() => {
  queryBuilder = createQueryBuilder();
  return queryBuilder;
});

const {
  getServices,
  createBooking,
  getAvailableSlots,
  getBookings,
  updateBookingStatus,
  deleteBooking,
  toggleSlotBlock,
  unblockDay,
  getClients,
  deleteClient,
  createClient,
  updateClient,
  autoCompleteExpiredBookings,
} = await import('./api');

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: [], error: null };
  mockFrom.mockImplementation(() => {
    queryBuilder = createQueryBuilder();
    return queryBuilder;
  });
});

describe('getServices', () => {
  it('retorna servicos unicos', async () => {
    queryResult = {
      data: [
        { id: '1', name: 'Corte', price: 35, duration: 40 },
        { id: '2', name: 'Barba', price: 27, duration: 20 },
        { id: '3', name: 'Corte', price: 35, duration: 40 },
      ],
      error: null,
    };

    const result = await getServices();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Corte');
    expect(result[1].name).toBe('Barba');
  });

  it('retorna array vazio quando nao ha dados', async () => {
    queryResult = { data: null, error: null };
    const result = await getServices();
    expect(result).toEqual([]);
  });

  it('lanca erro quando supabase retorna erro', async () => {
    queryResult = { data: null, error: new Error('DB error') };
    await expect(getServices()).rejects.toThrow('DB error');
  });
});

describe('createBooking', () => {
  it('chama RPC criar_agendamento com parametros corretos', async () => {
    mockRpc.mockResolvedValue({
      data: { id: 'booking-1', client_id: 'client-1', status: 'confirmed' },
      error: null,
    });

    const bookingData = {
      service_ids: ['s1', 's2'],
      booking_date: '2026-07-01',
      booking_time: '10:00',
      total_price: 62,
      total_duration: 60,
    };
    const clientData = { name: 'Joao', phone: '31999999999', email: 'joao@test.com' };

    const result = await createBooking(bookingData, clientData);

    expect(mockRpc).toHaveBeenCalledWith('criar_agendamento', {
      p_cliente_nome: 'Joao',
      p_cliente_telefone: '31999999999',
      p_cliente_email: 'joao@test.com',
      p_servicos: ['s1', 's2'],
      p_data: '2026-07-01',
      p_hora: '10:00',
      p_preco_total: 62,
      p_duracao_total: 60,
    });
    expect(result).toBeDefined();
  });

  it('trata erro de horario preenchido', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Este horário acabou de ser preenchido' },
    });

    await expect(
      createBooking(
        {
          service_ids: ['s1'],
          booking_date: '2026-07-01',
          booking_time: '10:00',
          total_price: 35,
          total_duration: 40,
        },
        { name: 'Test', phone: '31999999999' }
      )
    ).rejects.toThrow('Este horário acabou de ser preenchido');
  });

  it('trata erro de limite de agendamentos', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Limite de 3 agendamentos por dia atingido' },
    });

    await expect(
      createBooking(
        {
          service_ids: ['s1'],
          booking_date: '2026-07-01',
          booking_time: '10:00',
          total_price: 35,
          total_duration: 40,
        },
        { name: 'Test', phone: '31999999999' }
      )
    ).rejects.toThrow('Limite de 3 agendamentos por dia');
  });

  it('valida nome vazio no client-side', async () => {
    await expect(
      createBooking(
        {
          service_ids: ['s1'],
          booking_date: '2026-07-01',
          booking_time: '10:00',
          total_price: 35,
          total_duration: 40,
        },
        { name: '  ', phone: '31999999999' }
      )
    ).rejects.toThrow('Informe seu nome');
  });

  it('valida telefone curto no client-side', async () => {
    await expect(
      createBooking(
        {
          service_ids: ['s1'],
          booking_date: '2026-07-01',
          booking_time: '10:00',
          total_price: 35,
          total_duration: 40,
        },
        { name: 'Test', phone: '3199' }
      )
    ).rejects.toThrow('telefone válido');
  });

  it('valida servicos vazios no client-side', async () => {
    await expect(
      createBooking(
        {
          service_ids: [],
          booking_date: '2026-07-01',
          booking_time: '10:00',
          total_price: 35,
          total_duration: 40,
        },
        { name: 'Test', phone: '31999999999' }
      )
    ).rejects.toThrow('pelo menos um serviço');
  });
});

describe('getAvailableSlots', () => {
  it('retorna slots formatados', async () => {
    mockRpc.mockResolvedValue({
      data: [{ slot_time: '08:00:00' }, { slot_time: '09:00:00' }],
      error: null,
    });

    const result = await getAvailableSlots('2026-07-01');
    expect(result).toEqual(['08:00', '09:00']);
  });

  it('retorna array vazio quando sem slots', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const result = await getAvailableSlots('2026-07-01');
    expect(result).toEqual([]);
  });
});

describe('getBookings', () => {
  it('retorna bookings com client join', async () => {
    queryResult = {
      data: [{ id: 'b1', clients: { name: 'Joao', phone: '123' } }],
      error: null,
    };

    const result = await getBookings('2026-07-01');
    expect(result).toHaveLength(1);
  });

  it('filtra por data quando fornecida', async () => {
    queryResult = { data: [], error: null };
    await getBookings('2026-07-01');
    expect(queryBuilder.eq).toHaveBeenCalledWith('booking_date', '2026-07-01');
  });
});

describe('updateBookingStatus', () => {
  it('atualiza status do booking', async () => {
    queryResult = { data: null, error: null };
    await updateBookingStatus('b1', 'completed');
    expect(queryBuilder.update).toHaveBeenCalledWith({ status: 'completed' });
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'b1');
  });
});

describe('deleteBooking', () => {
  it('deleta booking por id', async () => {
    queryResult = { data: null, error: null };
    await deleteBooking('b1');
    expect(queryBuilder.delete).toHaveBeenCalled();
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'b1');
  });
});

describe('toggleSlotBlock', () => {
  it('chama RPC toggle_slot_block', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'b1', blocked: true }, error: null });
    const result = await toggleSlotBlock('2026-07-01', '10:00');
    expect(mockRpc).toHaveBeenCalledWith('toggle_slot_block', {
      p_date: '2026-07-01',
      p_time: '10:00',
    });
    expect(result.blocked).toBe(true);
  });
});

describe('unblockDay', () => {
  it('chama RPC unblock_day', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await unblockDay('2026-07-01');
    expect(mockRpc).toHaveBeenCalledWith('unblock_day', { p_date: '2026-07-01' });
  });
});

describe('getClients', () => {
  it('retorna lista de clientes', async () => {
    queryResult = {
      data: [{ id: 'c1', name: 'Joao', phone: '123' }],
      error: null,
    };
    const result = await getClients();
    expect(result).toHaveLength(1);
  });
});

describe('deleteClient', () => {
  it('faz soft delete do cliente', async () => {
    queryResult = { data: null, error: null };
    await deleteClient('c1');
    expect(queryBuilder.update).toHaveBeenCalled();
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'c1');
  });
});

describe('createClient', () => {
  it('cria novo cliente', async () => {
    const builder = createQueryBuilder();
    builder.single = vi
      .fn()
      .mockResolvedValue({ data: { id: 'c1', name: 'Novo', phone: '123' }, error: null });
    mockFrom.mockReturnValue(builder);
    const result = await createClient({ name: 'Novo', phone: '123' });
    expect(result.name).toBe('Novo');
  });
});

describe('updateClient', () => {
  it('atualiza dados do cliente', async () => {
    queryResult = { data: null, error: null };
    await updateClient('c1', { name: 'Atualizado', phone: '456' });
    expect(queryBuilder.update).toHaveBeenCalledWith({ name: 'Atualizado', phone: '456' });
  });
});

describe('autoCompleteExpiredBookings', () => {
  it('retorna 0 quando nao ha bookings', async () => {
    queryResult = { data: [], error: null };
    const result = await autoCompleteExpiredBookings('2026-07-01');
    expect(result).toBe(0);
  });
});
