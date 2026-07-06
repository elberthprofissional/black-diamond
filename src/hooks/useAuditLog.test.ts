import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuditLog } from './useAuditLog';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-123' } } } }),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('useAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna funções de log', () => {
    const { result } = renderHook(() => useAuditLog());
    expect(typeof result.current.log).toBe('function');
    expect(typeof result.current.logLogin).toBe('function');
    expect(typeof result.current.logBooking).toBe('function');
    expect(typeof result.current.logClient).toBe('function');
    expect(typeof result.current.logService).toBe('function');
    expect(typeof result.current.logSettings).toBe('function');
  });

  it('log não lança erro mesmo com falha', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockRejectedValue(new Error('DB error')),
    } as unknown as ReturnType<typeof supabase.from>);

    const { result } = renderHook(() => useAuditLog());

    await expect(result.current.log({ action: 'login_success' })).resolves.not.toThrow();
  });
});
