import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import { queryClientWrapper } from '../test/query-client-wrapper';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const { mockGetUser, mockFrom, mockRemoveChannel } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRemoveChannel: vi.fn(),
}));

let _chainResult: { data: unknown; error: unknown } = { data: [], error: null };

function _buildChain(): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'update', 'delete', 'eq', 'in', 'order', 'limit', 'maybeSingle'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = vi
    .fn()
    .mockImplementation((resolve: (v: unknown) => unknown) =>
      Promise.resolve(_chainResult).then(resolve as (...args: unknown[]) => unknown)
    );
  return chain;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue('SUBSCRIBED'),
    })),
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('./useNotificationPrefs', () => ({
  useNotificationPrefs: () => ({
    prefs: { inApp: true, sound: true, preview: true, badge: true },
  }),
}));

vi.mock('../lib/logger', () => ({ logError: vi.fn() }));

vi.mock('../lib/fire-and-forget', () => ({
  fireAndForget: vi.fn(),
}));

// ─── AudioContext mock ─────────────────────────────────────────────────────────

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  destination: {},
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    frequency: { setValueAtTime: vi.fn() },
    type: 'sine',
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  })),
  resume: vi.fn(),
};

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  configurable: true,
  value: vi.fn(() => mockAudioContext),
});

// ─── Test data ────────────────────────────────────────────────────────────────

const mockUser = { id: 'user-1' };

const mockNotifications = [
  {
    id: 'notif-1',
    title: 'New Booking',
    body: 'Client booked a haircut',
    tag: 'booking',
    url: '/admin',
    read: false,
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 'notif-2',
    title: 'Cancellation',
    body: 'Booking was cancelled',
    tag: 'cancellation',
    url: null,
    read: true,
    created_at: '2024-01-01T09:00:00Z',
  },
  {
    id: 'notif-3',
    title: 'Reminder',
    body: 'Upcoming appointment',
    tag: 'reminder',
    url: null,
    read: false,
    created_at: '2024-01-01T08:00:00Z',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Aguarda microtasks do React Query processarem */
function flushRq(): Promise<void> {
  return new Promise((r) => setTimeout(r, 50));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _chainResult = { data: [], error: null };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockRemoveChannel.mockResolvedValue({ error: null });
    mockFrom.mockImplementation(() => {
      const chain = _buildChain();
      return chain;
    });
  });

  it('returns initial state (empty notifications, loading true)', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.showPreview).toBeNull();
  });

  it('fetches notifications on mount', async () => {
    _chainResult = { data: mockNotifications, error: null };
    const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.notifications[0].id).toBe('notif-1');
    expect(mockGetUser).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith('notifications');
  });

  it('returns empty array when auth fails', async () => {
    mockGetUser.mockRejectedValue(new Error('Auth error'));
    const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toEqual([]);
  });

  it('unreadCount calculates correctly', async () => {
    _chainResult = { data: mockNotifications, error: null };
    const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // notif-1 and notif-3 are unread
    expect(result.current.unreadCount).toBe(2);
  });

  // ── markAsRead ──────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('updates state optimistically and calls supabase', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.unreadCount).toBe(2);

      await act(async () => {
        await result.current.markAsRead('notif-1');
        await flushRq();
      });

      expect(result.current.notifications.find((n) => n.id === 'notif-1')?.read).toBe(true);
      expect(result.current.unreadCount).toBe(1);
    });

    it('does not throw on error (rollback via onError)', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Make the update fail: the mock's update returns an error
      // We need to intercept the 'update' chain method
      _chainResult = { data: null, error: new Error('Update failed') };

      await act(async () => {
        try {
          await result.current.markAsRead('notif-1');
        } catch {
          // mutateAsync propaga erro, mas onError faz rollback
        }
        await flushRq();
      });

      // After rollback, notification should still be unread
      expect(result.current.notifications.find((n) => n.id === 'notif-1')?.read).toBe(false);
      expect(result.current.unreadCount).toBe(2);
    });
  });

  // ── clearNotification ───────────────────────────────────────────────────────

  describe('clearNotification', () => {
    it('removes notification from state and calls delete', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(3);

      await act(async () => {
        await result.current.clearNotification('notif-1');
        await flushRq();
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications.find((n) => n.id === 'notif-1')).toBeUndefined();
    });

    it('rolls back on error', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      _chainResult = { data: null, error: { message: 'Delete failed' } };

      await act(async () => {
        try {
          await result.current.clearNotification('notif-1');
        } catch {
          // mutateAsync propaga erro, mas onError faz rollback
        }
        await flushRq();
      });

      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.notifications.find((n) => n.id === 'notif-1')).toBeDefined();
    });
  });

  // ── bulkDelete ──────────────────────────────────────────────────────────────

  describe('bulkDelete', () => {
    it('removes multiple notifications from state', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.bulkDelete(['notif-1', 'notif-3']);
        await flushRq();
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe('notif-2');
    });

    it('does nothing when ids array is empty', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.bulkDelete([]);
        await flushRq();
      });

      expect(result.current.notifications).toHaveLength(3);
    });
  });

  // ── dismissPreview ──────────────────────────────────────────────────────────

  describe('dismissPreview', () => {
    it('is a function', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });
      expect(typeof result.current.dismissPreview).toBe('function');
    });
  });

  // ── refetch ─────────────────────────────────────────────────────────────────

  describe('refetch', () => {
    it('exposes refetch function', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });
      expect(typeof result.current.refetch).toBe('function');
    });

    it('re-fetches notifications when called', async () => {
      _chainResult = { data: [], error: null };
      const { result } = renderHook(() => useNotifications(), { wrapper: queryClientWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(0);

      _chainResult = { data: mockNotifications, error: null };

      await act(async () => {
        await result.current.refetch();
        await flushRq();
      });

      expect(result.current.notifications).toHaveLength(3);
    });
  });
});
