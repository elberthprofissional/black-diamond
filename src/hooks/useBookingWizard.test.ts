import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBookingWizard } from './useBookingWizard'

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}))

vi.mock('../lib/api', () => ({
  createBooking: vi.fn(),
  getAvailableSlots: vi.fn(),
  getBookings: vi.fn(),
  getClientByPhone: vi.fn().mockResolvedValue(null),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

vi.mock('../lib/utils', () => ({
  getNextDays: vi.fn(() => []),
  formatPhone: vi.fn((v: string) => v),
  getTimeSlotsForDate: vi.fn(() => ['08:00', '09:00', '10:00']),
}))

vi.mock('./useServices', () => ({
  useServices: vi.fn(() => ({
    services: [
      { id: 's1', name: 'Corte', price: 35, duration: 40 },
      { id: 's2', name: 'Barba', price: 27, duration: 20 },
    ],
  })),
}))

import { getAvailableSlots, getBookings } from '../lib/api'

const mockShowError = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getBookings).mockResolvedValue([])
  vi.mocked(getAvailableSlots).mockResolvedValue(['08:00', '09:00', '10:00'])
})

describe('useBookingWizard', () => {
  it('inicia no step 1', () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))
    expect(result.current.step).toBe(1)
  })

  it('stepTitle muda por step', () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))
    expect(result.current.stepTitle).toBe('Seus dados')

    act(() => result.current.setStep(2))
    expect(result.current.stepTitle).toBe('Escolha os serviços')

    act(() => result.current.setStep(3))
    expect(result.current.stepTitle).toBe('Data e horário')

    act(() => result.current.setStep(4))
    expect(result.current.stepTitle).toBe('Revisar agendamento')
  })

  it('toggleService adiciona e remove servico', () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))
    const service = { id: 's1', name: 'Corte', price: 35, duration: 40 }

    act(() => result.current.toggleService(service))
    expect(result.current.selectedServices).toHaveLength(1)

    act(() => result.current.toggleService(service))
    expect(result.current.selectedServices).toHaveLength(0)
  })

  it('totalPrice calcula corretamente', () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))

    act(() => result.current.toggleService({ id: 's1', name: 'Corte', price: 35, duration: 40 }))
    act(() => result.current.toggleService({ id: 's2', name: 'Barba', price: 27, duration: 20 }))

    expect(result.current.totalPrice).toBe(62)
  })

  it('isStepDisabled retorna true no step 1 sem dados', () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))
    expect(result.current.isStepDisabled).toBe(true)
  })

  it('isStepDisabled retorna false no step 1 com dados validos', () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))

    act(() => result.current.setUserInfo({ name: 'Joao Silva', phone: '31999999999' }))

    expect(result.current.isStepDisabled).toBe(false)
  })

  it('goNext avanca step', () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))

    act(() => result.current.setUserInfo({ name: 'Joao Silva', phone: '31999999999' }))
    act(() => result.current.goNext())
    expect(result.current.step).toBe(2)
  })

  it('goBack volta step', () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))

    act(() => result.current.setStep(3))
    act(() => result.current.goBack())
    expect(result.current.step).toBe(2)
  })

  it('goBack nao vai abaixo de 1', () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))
    act(() => result.current.goBack())
    expect(result.current.step).toBe(1)
  })

  it('carrega bookings e slots ao selecionar data', async () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))

    await act(async () => {
      result.current.setSelectedDate('2026-07-01')
    })

    expect(getBookings).toHaveBeenCalledWith('2026-07-01')
    expect(getAvailableSlots).toHaveBeenCalledWith('2026-07-01')
  })

  it('handleMouseDown inicia drag', () => {
    const { result } = renderHook(() => useBookingWizard(mockShowError))

    const mockEvent = {
      pageX: 100,
      preventDefault: vi.fn(),
    } as unknown as React.MouseEvent

    act(() => result.current.handleMouseDown(mockEvent))
  })
})
