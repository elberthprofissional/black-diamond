import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBookingModals } from './useBookingModals'

vi.mock('../lib/api', () => ({
  updateBookingStatus: vi.fn(),
  deleteBooking: vi.fn(),
}))

import { updateBookingStatus, deleteBooking } from '../lib/api'

const mockLoadData = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadData.mockResolvedValue(undefined)
})

describe('useBookingModals', () => {
  it('inicializa com estados nulos', () => {
    const { result } = renderHook(() => useBookingModals(mockLoadData))

    expect(result.current.completingBooking).toBeNull()
    expect(result.current.selectedBooking).toBeNull()
    expect(result.current.bookingToDelete).toBeNull()
  })

  it('handleComplete atualiza status e recarrega dados', async () => {
    vi.mocked(updateBookingStatus).mockResolvedValue(undefined)

    const { result } = renderHook(() => useBookingModals(mockLoadData))

    const mockBooking = { id: 'b1', status: 'confirmed' } as never
    act(() => result.current.setCompletingBooking(mockBooking))

    await act(async () => {
      await result.current.handleComplete()
    })

    expect(updateBookingStatus).toHaveBeenCalledWith('b1', 'completed')
    expect(mockLoadData).toHaveBeenCalled()
    expect(result.current.completingBooking).toBeNull()
  })

  it('handleComplete nao faz nada sem completingBooking', async () => {
    const { result } = renderHook(() => useBookingModals(mockLoadData))

    await act(async () => {
      await result.current.handleComplete()
    })

    expect(updateBookingStatus).not.toHaveBeenCalled()
  })

  it('confirmDelete deleta booking e recarrega dados', async () => {
    vi.mocked(deleteBooking).mockResolvedValue(undefined)

    const { result } = renderHook(() => useBookingModals(mockLoadData))

    const mockBooking = { id: 'b2' } as never
    act(() => result.current.setBookingToDelete(mockBooking))
    act(() => result.current.setSelectedBooking(mockBooking))

    await act(async () => {
      await result.current.confirmDelete()
    })

    expect(deleteBooking).toHaveBeenCalledWith('b2')
    expect(mockLoadData).toHaveBeenCalled()
    expect(result.current.bookingToDelete).toBeNull()
    expect(result.current.selectedBooking).toBeNull()
  })

  it('confirmDelete nao faz nada sem bookingToDelete', async () => {
    const { result } = renderHook(() => useBookingModals(mockLoadData))

    await act(async () => {
      await result.current.confirmDelete()
    })

    expect(deleteBooking).not.toHaveBeenCalled()
  })
})
