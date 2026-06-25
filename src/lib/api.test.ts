import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  },
}))

import { supabase } from '../lib/supabase'
import {
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
  updateClientNotes,
} from '../lib/api'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getServices', () => {
  it('retorna lista de servicos', async () => {
    const mockData = [
      { id: '1', name: 'Corte', price: 35, duration: 40 },
      { id: '2', name: 'Barba', price: 27, duration: 20 },
    ]
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as ReturnType<typeof supabase.from>)

    const result = await getServices()
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Corte')
  })

  it('lanca erro quando supabase retorna erro', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as ReturnType<typeof supabase.from>)

    await expect(getServices()).rejects.toThrow('DB error')
  })

  it('retorna array vazio quando data e null', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as ReturnType<typeof supabase.from>)

    const result = await getServices()
    expect(result).toEqual([])
  })
})

describe('getBookings', () => {
  it('retorna agendamentos sem filtro de data', async () => {
    const mockData = [
      { id: '1', booking_date: '2026-06-24', clients: { name: 'Joao', phone: '31999999999' } },
    ]
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>)

    const result = await getBookings()
    expect(result).toHaveLength(1)
  })

  it('filtra por data quando fornecida', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>)

    await getBookings('2026-06-24')
    expect(mockChain.eq).toHaveBeenCalledWith('booking_date', '2026-06-24')
  })
})

describe('updateBookingStatus', () => {
  it('atualiza status do agendamento', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>)

    await updateBookingStatus('booking-1', 'completed')
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'completed' })
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'booking-1')
  })
})

describe('deleteBooking', () => {
  it('deleta agendamento por id', async () => {
    const mockChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>)

    await deleteBooking('booking-1')
    expect(mockChain.delete).toHaveBeenCalled()
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'booking-1')
  })
})

describe('getClients', () => {
  it('retorna lista de clientes', async () => {
    const mockData = [
      { id: '1', name: 'Joao', phone: '31999999999' },
    ]
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as ReturnType<typeof supabase.from>)

    const result = await getClients()
    expect(result).toHaveLength(1)
  })
})

describe('createClient', () => {
  it('cria novo cliente', async () => {
    const mockData = { id: '1', name: 'Joao', phone: '31999999999' }
    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>)

    const result = await createClient({ name: 'Joao', phone: '31999999999' })
    expect(result).toEqual(mockData)
  })
})

describe('deleteClient', () => {
  it('deleta cliente por id', async () => {
    const mockChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>)

    await deleteClient('client-1')
    expect(mockChain.delete).toHaveBeenCalled()
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'client-1')
  })
})

describe('updateClient', () => {
  it('atualiza dados do cliente', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>)

    await updateClient('client-1', { name: 'Joao', phone: '31999999999' })
    expect(mockChain.update).toHaveBeenCalledWith({ name: 'Joao', phone: '31999999999' })
  })
})

describe('updateClientNotes', () => {
  it('atualiza anotacoes do cliente', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as ReturnType<typeof supabase.from>)

    await updateClientNotes('client-1', 'Prefere degrader')
    expect(mockChain.update).toHaveBeenCalledWith({ notes: 'Prefere degrader' })
  })
})

describe('createBooking', () => {
  it('chama a RPC criar_agendamento', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { id: 'booking-1', status: 'confirmed' },
      error: null,
    })

    const result = await createBooking(
      {
        service_ids: ['s1'],
        booking_date: '2026-06-24',
        booking_time: '09:00',
        total_price: 35,
        total_duration: 40,
      },
      { name: 'Joao', phone: '31999999999' }
    )

    expect(supabase.rpc).toHaveBeenCalledWith('criar_agendamento', {
      p_cliente_nome: 'Joao',
      p_cliente_telefone: '31999999999',
      p_cliente_email: null,
      p_servicos: ['s1'],
      p_data: '2026-06-24',
      p_hora: '09:00',
      p_preco_total: 35,
      p_duracao_total: 40,
    })
    expect(result).toBeDefined()
  })

  it('lanca erro de horario preenchido', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Este horário acabou de ser preenchido' },
    })

    await expect(
      createBooking(
        { service_ids: ['s1'], booking_date: '2026-06-24', booking_time: '09:00', total_price: 35, total_duration: 40 },
        { name: 'Joao', phone: '31999999999' }
      )
    ).rejects.toThrow('Este horário acabou de ser preenchido')
  })

  it('lanca erro de rate limit', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'limite de agendamentos para este dia' },
    })

    await expect(
      createBooking(
        { service_ids: ['s1'], booking_date: '2026-06-24', booking_time: '09:00', total_price: 35, total_duration: 40 },
        { name: 'Joao', phone: '31999999999' }
      )
    ).rejects.toThrow('limite de agendamentos')
  })
})

describe('getAvailableSlots', () => {
  it('retorna slots formatados (HH:MM)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ slot_time: '08:00:00' }, { slot_time: '09:00:00' }],
      error: null,
    })

    const result = await getAvailableSlots('2026-06-24')
    expect(result).toEqual(['08:00', '09:00'])
  })

  it('retorna array vazio quando nao ha slots', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null })

    const result = await getAvailableSlots('2026-06-24')
    expect(result).toEqual([])
  })
})

describe('toggleSlotBlock', () => {
  it('chama a RPC toggle_slot_block', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { id: '1', blocked: true },
      error: null,
    })

    const result = await toggleSlotBlock('2026-06-24', '09:00')
    expect(supabase.rpc).toHaveBeenCalledWith('toggle_slot_block', {
      p_date: '2026-06-24',
      p_time: '09:00',
    })
    expect(result.blocked).toBe(true)
  })
})

describe('unblockDay', () => {
  it('chama a RPC unblock_day', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null })

    await unblockDay('2026-06-24')
    expect(supabase.rpc).toHaveBeenCalledWith('unblock_day', { p_date: '2026-06-24' })
  })
})
