import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNotifications } from './useNotifications';

const mockFrom = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn().mockResolvedValue({ error: null }),
  },
}));

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockFrom.mockReturnValue(chain);
  });

  it('initializes with empty notifications', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('exposes markAsRead function', () => {
    const { result } = renderHook(() => useNotifications());
    expect(typeof result.current.markAsRead).toBe('function');
  });

  it('exposes markAllAsRead function', () => {
    const { result } = renderHook(() => useNotifications());
    expect(typeof result.current.markAllAsRead).toBe('function');
  });

  it('exposes refetch function', () => {
    const { result } = renderHook(() => useNotifications());
    expect(typeof result.current.refetch).toBe('function');
  });
});
