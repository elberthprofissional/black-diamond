import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useConnectionStatus } from '../hooks/useConnectionStatus'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useConnectionStatus', () => {
  it('inicia com status connected', () => {
    const { result } = renderHook(() => useConnectionStatus())
    expect(result.current.status).toBe('connected')
  })

 it('expoe funcao checkConnection', () => {
    const { result } = renderHook(() => useConnectionStatus())
    expect(typeof result.current.checkConnection).toBe('function')
  })
})
