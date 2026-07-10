import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

import { supabase } from '../lib/supabase';
import {
  createBooking,
  getAvailableSlots,
  toggleSlotBlock,
  unblockDay,
  getBookings,
} from '../lib/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Fluxo completo de agendamento', () => {
  it('cria agendamento e retorna dados corretos', async () => {
    const mockBooking = {
      id: 'booking-123',
      client_id: 'client-456',
      service_ids: ['svc-1', 'svc-2'],
      booking_date: '2026-06-25',
      booking_time: '09:00',
      total_price: 62,
      total_duration: 60,
      status: 'confirmed',
    };

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockBooking,
      error: null,
    });

    const result = await createBooking(
      {
        service_ids: ['svc-1', 'svc-2'],
        booking_date: '2026-06-25',
        booking_time: '09:00',
        total_price: 62,
        total_duration: 60,
      },
      { name: 'João Silva', phone: '31999999999' }
    );

    expect(supabase.rpc).toHaveBeenCalledWith('criar_agendamento_rate_limited', {
      p_cliente_nome: 'João Silva',
      p_cliente_telefone: '31999999999',
      p_cliente_email: null,
      p_servicos: ['svc-1', 'svc-2'],
      p_data: '2026-06-25',
      p_hora: '09:00',
      p_preco_total: 62,
      p_duracao_total: 60,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('impede agendamento no mesmo horário (double booking)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Este horário acabou de ser preenchido.' },
    });

    await expect(
      createBooking(
        {
          service_ids: ['svc-1'],
          booking_date: '2026-06-25',
          booking_time: '09:00',
          total_price: 35,
          total_duration: 40,
        },
        { name: 'Maria', phone: '31988888888' }
      )
    ).rejects.toThrow('horário acabou de ser preenchido');
  });

  it('respeita rate limit de 3 agendamentos por dia', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: {
        message: 'Você já atingiu o limite de agendamentos para este dia. Máximo 3 por dia.',
      },
    });

    await expect(
      createBooking(
        {
          service_ids: ['svc-1'],
          booking_date: '2026-06-25',
          booking_time: '10:00',
          total_price: 35,
          total_duration: 40,
        },
        { name: 'Pedro', phone: '31977777777' }
      )
    ).rejects.toThrow('limite de agendamentos');
  });
});

describe('Bloqueio de horários', () => {
  it('bloqueia um horário existente', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { id: 'booking-blocked', blocked: true },
      error: null,
    });

    const result = await toggleSlotBlock('2026-06-25', '09:00');

    expect(supabase.rpc).toHaveBeenCalledWith('toggle_slot_block', {
      p_date: '2026-06-25',
      p_time: '09:00',
    });
    expect(result.blocked).toBe(true);
  });

  it('cria booking bloqueado quando slot está livre', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { id: 'new-blocked', blocked: true },
      error: null,
    });

    const result = await toggleSlotBlock('2026-06-25', '15:00');
    expect(result.blocked).toBe(true);
  });

  it('desbloqueia todos os horários de um dia', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

    await unblockDay('2026-06-25');
    expect(supabase.rpc).toHaveBeenCalledWith('unblock_day', { p_date: '2026-06-25' });
  });
});

describe('Slots disponíveis', () => {
  it('retorna slots para uma data', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ slot_time: '08:30:00' }, { slot_time: '09:30:00' }, { slot_time: '10:30:00' }],
      error: null,
    });

    const slots = await getAvailableSlots('2026-06-25');
    expect(slots).toEqual(['08:30', '09:30', '10:30']);
  });

  it('retorna vazio quando todos os horários estão ocupados', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null });

    const slots = await getAvailableSlots('2026-06-25');
    expect(slots).toEqual([]);
  });
});

describe('Fluxo admin: concluir atendimento', () => {
  it('atualiza status para completed', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>);

    const { updateBookingStatus } = await import('../lib/api');
    await updateBookingStatus('booking-1', 'completed');

    expect(mockChain.update).toHaveBeenCalledWith({ status: 'completed' });
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'booking-1');
  });
});

describe('Fluxo admin: cancelar agendamento', () => {
  it('cancela booking por id (status update)', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>);

    const { deleteBooking } = await import('../lib/api');
    await deleteBooking('booking-99');

    expect(mockChain.update).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'booking-99');
  });
});

describe('Consulta de agendamentos', () => {
  it('retorna bookings com dados do cliente', async () => {
    const mockData = [
      {
        id: 'b1',
        booking_date: '2026-06-25',
        booking_time: '09:00:00',
        status: 'confirmed',
        total_price: 35,
        clients: { name: 'João', phone: '31999999999' },
      },
    ];

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 }),
    };
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>);

    const result = await getBookings('2026-06-25');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].clients?.name).toBe('João');
  });

  it('filtra por data correta', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    };
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>);

    await getBookings('2026-07-01');
    expect(mockChain.eq).toHaveBeenCalledWith('booking_date', '2026-07-01');
  });
});
