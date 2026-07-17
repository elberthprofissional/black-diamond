import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockSelect = vi.fn().mockResolvedValue({ error: null });
const mockRemoveChannel = vi.fn();
const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
const mockChannelOn = vi.fn().mockReturnThis();

vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        limit: mockSelect,
      })),
      channel: vi.fn(() => ({
        on: mockChannelOn,
        subscribe: mockSubscribe,
      })),
      removeChannel: mockRemoveChannel,
    },
  };
});

describe('useConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue({ error: null });
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inicia com status connected', async () => {
    const { useConnectionStatus } = await import('./useConnectionStatus');
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current.status).toBe('connected');
  });

  it('expoe funcao checkConnection', async () => {
    const { useConnectionStatus } = await import('./useConnectionStatus');
    const { result } = renderHook(() => useConnectionStatus());
    expect(typeof result.current.checkConnection).toBe('function');
  });

  it('detecta quando fica offline via evento do browser', async () => {
    const { useConnectionStatus } = await import('./useConnectionStatus');
    const { result } = renderHook(() => useConnectionStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.status).toBe('disconnected');
  });

  it('detecta quando volta online e verifica conexão', async () => {
    mockSelect.mockResolvedValueOnce({ error: null });

    const { useConnectionStatus } = await import('./useConnectionStatus');
    const { result } = renderHook(() => useConnectionStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.status).toBe('disconnected');

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(mockSelect).toHaveBeenCalled();
  });

  it('detecta erro de conexão com Supabase', async () => {
    mockSelect.mockResolvedValueOnce({ error: { message: 'connection refused' } });

    const { useConnectionStatus } = await import('./useConnectionStatus');
    const { result } = renderHook(() => useConnectionStatus());

    await act(async () => {
      await result.current.checkConnection();
    });

    expect(result.current.status).toBe('disconnected');
  });

  it('limpa listeners no unmount', async () => {
    const { useConnectionStatus } = await import('./useConnectionStatus');
    const { unmount } = renderHook(() => useConnectionStatus());

    unmount();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
  });

  it('remove canal do Supabase no unmount', async () => {
    const { useConnectionStatus } = await import('./useConnectionStatus');
    const { unmount } = renderHook(() => useConnectionStatus());

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
