import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from './usePushNotifications';

const mockPushSubscription = {
  endpoint: 'https://fcm.googleapis.com/test-endpoint',
  toJSON: () => ({
    endpoint: 'https://fcm.googleapis.com/test-endpoint',
    keys: { p256dh: 'key-p256dh', auth: 'key-auth' },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

const mockPushManager = {
  getSubscription: vi.fn().mockResolvedValue(null),
  subscribe: vi.fn().mockResolvedValue(mockPushSubscription),
};

const mockServiceWorkerRegistration = {
  pushManager: mockPushManager,
};

const mockServiceWorker = {
  ready: Promise.resolve(mockServiceWorkerRegistration),
};

// Set VAPID key via import.meta.env mock
vi.stubGlobal('importMetaEnv', {
  VITE_VAPID_PUBLIC_KEY: 'test-vapid-public-key',
});

// Mock supabase
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock logger
vi.mock('../lib/logger', () => ({
  logError: vi.fn(),
}));

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup navigator.serviceWorker by default
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true,
      configurable: true,
    });

    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      writable: true,
      configurable: true,
    });

    // Ensure PushManager exists
    Object.defineProperty(window, 'PushManager', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });

    mockPushManager.getSubscription.mockResolvedValue(null);
    mockPushManager.subscribe.mockResolvedValue(mockPushSubscription);
  });

  it('inicializa com estado padrão', () => {
    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.loading).toBe(true);
    expect(result.current.isSupported).toBe(true);
  });

  it('detecta que push não é suportado quando ServiceWorker não existe', async () => {
    delete (navigator as Record<string, unknown>).serviceWorker;

    const { result } = renderHook(() => usePushNotifications());

    // Wait for the effect to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.isSupported).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('verifica assinatura existente no mount', async () => {
    mockPushManager.getSubscription.mockResolvedValue(mockPushSubscription);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockPushManager.getSubscription).toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(true);
  });

  it('subscribe registra nova assinatura push', async () => {
    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(mockPushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });

    expect(mockRpc).toHaveBeenCalledWith('save_push_subscription', {
      p_endpoint: 'https://fcm.googleapis.com/test-endpoint',
      p_p256dh: 'key-p256dh',
      p_auth: 'key-auth',
    });
  });

  it('subscribe retorna false quando permissão negada', async () => {
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'denied',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePushNotifications());

    let subscribed: boolean | undefined;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(false);
  });

  it('unsubscribe cancela assinatura e limpa no servidor', async () => {
    mockPushManager.getSubscription.mockResolvedValue(mockPushSubscription);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mockPushSubscription.unsubscribe).toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith('delete_push_subscription', {
      p_endpoint: 'https://fcm.googleapis.com/test-endpoint',
    });
  });

  it('unsubscribe não faz nada quando não há assinatura', async () => {
    mockPushManager.getSubscription.mockResolvedValue(null);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mockPushSubscription.unsubscribe).not.toHaveBeenCalled();
  });

  it('retorna vapidMissing como false quando VAPID key está configurada', () => {
    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.vapidMissing).toBe(false);
  });

  it('trata erro no subscribe silenciosamente', async () => {
    mockPushManager.subscribe.mockRejectedValue(new Error('Push error'));

    const { result } = renderHook(() => usePushNotifications());

    let subscribed: boolean | undefined;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(false);
  });

  it('retorna isBlocked como false quando permissão é default', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isBlocked).toBe(false);
  });

  it('retorna isSupported como false quando PushManager não existe', async () => {
    delete (window as Record<string, unknown>).PushManager;

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.isSupported).toBe(false);
  });

  it('subscribe retorna false quando erro ocorre ao pedir permissão', async () => {
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'denied',
        requestPermission: vi.fn().mockRejectedValue(new Error('Permission error')),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePushNotifications());

    let subscribed: boolean | undefined;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(false);
  });
});
