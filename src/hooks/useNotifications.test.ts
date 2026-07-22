import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const { mockGetUser, mockFrom, mockRemoveChannel } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRemoveChannel: vi.fn(),
}));

let _chainResult: { data: unknown; error: unknown } = { data: [], error: null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _lastChain: Record<string, (...args: unknown[]) => any> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _buildChain(): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  const methods = ['select', 'update', 'delete', 'eq', 'in', 'order', 'limit', 'maybeSingle'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = vi
    .fn()
    .mockImplementation((resolve: (v: any) => any) => Promise.resolve(_chainResult).then(resolve));
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _chainResult = { data: [], error: null };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockRemoveChannel.mockResolvedValue({ error: null });
    mockFrom.mockImplementation(() => {
      _lastChain = _buildChain();
      return _lastChain;
    });
  });

  it('returns initial state (empty notifications, loading true)', () => {
    _chainResult = { data: [], error: null };
    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.showPreview).toBeNull();
  });

  it('fetches notifications on mount', async () => {
    _chainResult = { data: mockNotifications, error: null };
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.notifications[0].id).toBe('notif-1');
    expect(mockGetUser).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith('notifications');
  });

  it('sets loading to false even when fetch errors', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toEqual([]);
  });

  it('unreadCount calculates correctly', async () => {
    _chainResult = { data: mockNotifications, error: null };
    const { result } = renderHook(() => useNotifications());

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
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.unreadCount).toBe(2);

      _chainResult = { data: null, error: null };

      await act(async () => {
        await result.current.markAsRead('notif-1');
      });

      expect(result.current.notifications.find((n) => n.id === 'notif-1')?.read).toBe(true);
      expect(result.current.unreadCount).toBe(1);
      expect(_lastChain.update).toHaveBeenCalledWith({ read: true });
      expect(_lastChain.eq).toHaveBeenCalledWith('id', 'notif-1');
    });

    it('rolls back on error', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      _chainResult = { data: null, error: { message: 'Update failed' } };

      await act(async () => {
        await result.current.markAsRead('notif-1');
      });

      expect(result.current.notifications.find((n) => n.id === 'notif-1')?.read).toBe(false);
      expect(result.current.unreadCount).toBe(2);
    });
  });

  // ── markAllAsRead ───────────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('updates all notifications and calls supabase', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.unreadCount).toBe(2);

      _chainResult = { data: null, error: null };

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(result.current.unreadCount).toBe(0);
      expect(result.current.notifications.every((n) => n.read)).toBe(true);
      expect(_lastChain.update).toHaveBeenCalledWith({ read: true });
      expect(_lastChain.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(_lastChain.eq).toHaveBeenCalledWith('read', false);
    });

    it('rolls back on error', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      _chainResult = { data: null, error: { message: 'Update failed' } };

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(result.current.unreadCount).toBe(2);
      expect(result.current.notifications.find((n) => n.id === 'notif-1')?.read).toBe(false);
      expect(result.current.notifications.find((n) => n.id === 'notif-3')?.read).toBe(false);
    });
  });

  // ── clearNotification ───────────────────────────────────────────────────────

  describe('clearNotification', () => {
    it('removes notification from state and calls delete', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(3);

      _chainResult = { data: null, error: null };

      await act(async () => {
        await result.current.clearNotification('notif-1');
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications.find((n) => n.id === 'notif-1')).toBeUndefined();
      expect(_lastChain.delete).toHaveBeenCalled();
      expect(_lastChain.eq).toHaveBeenCalledWith('id', 'notif-1');
    });

    it('rolls back on error', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      _chainResult = { data: null, error: { message: 'Delete failed' } };

      await act(async () => {
        await result.current.clearNotification('notif-1');
      });

      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.notifications.find((n) => n.id === 'notif-1')).toBeDefined();
    });
  });

  // ── bulkDelete ──────────────────────────────────────────────────────────────

  describe('bulkDelete', () => {
    it('removes multiple notifications from state', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      _chainResult = { data: null, error: null };

      await act(async () => {
        await result.current.bulkDelete(['notif-1', 'notif-3']);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe('notif-2');
      expect(_lastChain.delete).toHaveBeenCalled();
      expect(_lastChain.in).toHaveBeenCalledWith('id', ['notif-1', 'notif-3']);
    });

    it('rolls back on error', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      _chainResult = { data: null, error: { message: 'Delete failed' } };

      await act(async () => {
        await result.current.bulkDelete(['notif-1', 'notif-3']);
      });

      expect(result.current.notifications).toHaveLength(3);
    });

    it('does nothing when ids array is empty', async () => {
      _chainResult = { data: mockNotifications, error: null };
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.bulkDelete([]);
      });

      expect(result.current.notifications).toHaveLength(3);
      // Only the initial fetch should have called from
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });
  });

  // ── dismissPreview ──────────────────────────────────────────────────────────

  describe('dismissPreview', () => {
    it('is a function', () => {
      const { result } = renderHook(() => useNotifications());
      expect(typeof result.current.dismissPreview).toBe('function');
    });

    it('clears preview (no-op when already null)', async () => {
      _chainResult = { data: [], error: null };
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.showPreview).toBeNull();

      act(() => {
        result.current.dismissPreview();
      });

      expect(result.current.showPreview).toBeNull();
    });
  });

  // ── updateTitleBadge ────────────────────────────────────────────────────────

  describe('updateTitleBadge', () => {
    it('updates document.title with unread count', async () => {
      const titleSetSpy = vi.spyOn(document, 'title', 'set').mockImplementation(() => {});
      try {
        _chainResult = { data: mockNotifications, error: null };
        renderHook(() => useNotifications());

        await waitFor(() => {
          // At some point the title should include the badge count
          const hasBadge = titleSetSpy.mock.calls.some(
            (call) => typeof call[0] === 'string' && /\(\d+\)\s*Black Diamond/.test(call[0])
          );
          expect(hasBadge).toBe(true);
        });
      } finally {
        titleSetSpy.mockRestore();
      }
    });

    it('resets title when count is 0', async () => {
      const titleSetSpy = vi.spyOn(document, 'title', 'set').mockImplementation(() => {});
      try {
        const allRead = mockNotifications.map((n) => ({ ...n, read: true }));
        _chainResult = { data: allRead, error: null };
        renderHook(() => useNotifications());

        await waitFor(() => {
          expect(titleSetSpy).toHaveBeenCalled();
        });

        expect(titleSetSpy).toHaveBeenLastCalledWith('Black Diamond');
      } finally {
        titleSetSpy.mockRestore();
      }
    });
  });

  // ── refetch ─────────────────────────────────────────────────────────────────

  describe('refetch', () => {
    it('exposes refetch function', () => {
      const { result } = renderHook(() => useNotifications());
      expect(typeof result.current.refetch).toBe('function');
    });

    it('re-fetches notifications when called', async () => {
      _chainResult = { data: [], error: null };
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(0);

      _chainResult = { data: mockNotifications, error: null };

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.notifications).toHaveLength(3);
    });
  });
});
