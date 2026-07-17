import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminLogout } from './useAdminLogout';

const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('useAdminLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      replace: vi.fn(),
    } as unknown as Location);
  });

  it('returns a logout function', () => {
    const { result } = renderHook(() => useAdminLogout());
    expect(typeof result.current).toBe('function');
  });

  it('calls signOut', async () => {
    const { result } = renderHook(() => useAdminLogout());
    await act(async () => {
      await result.current();
    });
    expect(mockSignOut).toHaveBeenCalled();
  });
});
