import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePwaInstall } from './usePwaInstall';

vi.mock('../lib/constants', () => ({
  STORAGE_PWA_INSTALLED: 'barber_pwa_installed',
}));

describe('usePwaInstall', () => {
  let originalUserAgent: string;
  let origStandalone: boolean | undefined;
  const registeredListeners: Record<string, EventListener[]> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    originalUserAgent = window.navigator.userAgent;
    origStandalone = (navigator as unknown as { standalone?: boolean }).standalone;

    // Track event listeners registered by the hook
    registeredListeners['beforeinstallprompt'] = [];
    registeredListeners['appinstalled'] = [];

    vi.spyOn(window, 'addEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        const fn =
          typeof listener === 'function' ? listener : (listener as EventListenerObject).handleEvent;
        if (registeredListeners[type]) {
          registeredListeners[type].push(fn);
        }
      }
    );
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    delete (window as unknown as { deferredPrompt?: unknown }).deferredPrompt;
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    (navigator as unknown as { standalone?: boolean }).standalone = origStandalone;
    delete (window as unknown as { deferredPrompt?: unknown }).deferredPrompt;
    vi.restoreAllMocks();
  });

  function setUserAgent(ua: string) {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  }

  function setStandalone(standalone: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)' ? standalone : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  it('detects desktop (non-iOS, non-Android)', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isIOS).toBe(false);
    expect(result.current.isAndroid).toBe(false);
    expect(result.current.isSamsung).toBe(false);
    expect(result.current.isStandalone).toBe(false);
    expect(result.current.isIOSChrome).toBe(false);
    expect(result.current.canInstall).toBe(true);
  });

  it('detects iOS (iPhone)', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isIOS).toBe(true);
    expect(result.current.isAndroid).toBe(false);
  });

  it('detects iOS (iPad)', () => {
    setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isIOS).toBe(true);
  });

  it('detects iOS (iPod)', () => {
    setUserAgent('Mozilla/5.0 (iPod; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isIOS).toBe(true);
  });

  it('detects Android', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isAndroid).toBe(true);
    expect(result.current.isIOS).toBe(false);
  });

  it('detects Samsung Internet', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-G998B) SamsungBrowser/23.0');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isSamsung).toBe(true);
  });

  it('detects Samsung via "samsung" substring', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) samsung/23.0');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isSamsung).toBe(true);
  });

  it('detects standalone mode via matchMedia', () => {
    setStandalone(true);
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isStandalone).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('detects standalone via navigator.standalone', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    (navigator as unknown as { standalone: boolean }).standalone = true;
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isStandalone).toBe(true);
  });

  // NOTE: The hook has a bug where isIOSChrome is always false.
  // `ua` is lowercased on line 59, but `ua.includes('CriOS')` on line 66
  // uses mixed case. Since the string is lowercased, 'CriOS' never matches.
  // These tests verify the ACTUAL behavior (isIOSChrome = false).
  it('isIOSChrome is always false due to case mismatch in source (CriOS bug)', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0.0.0');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isIOSChrome).toBe(false);
    expect(result.current.canInstall).toBe(true);
  });

  it('iOS Safari is not iOSChrome', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Safari/605.1.15'
    );
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isIOSChrome).toBe(false);
  });

  it('handleInstall: standalone -> shows error via onError', async () => {
    setStandalone(true);
    const onError = vi.fn();
    const { result } = renderHook(() => usePwaInstall(undefined, onError));
    await act(async () => {
      await result.current.handleInstall();
    });
    expect(onError).toHaveBeenCalledWith('Aplicativo já instalado!');
  });

  it('handleInstall: standalone -> no onSuccess call', async () => {
    setStandalone(true);
    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePwaInstall(onSuccess));
    await act(async () => {
      await result.current.handleInstall();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('handleInstall: iOS device (not standalone) -> shows prompt modal (no deferred prompt)', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.showPrompt).toBe(false);
    await act(async () => {
      await result.current.handleInstall();
    });
    expect(result.current.showPrompt).toBe(true);
  });

  it('handleInstall: Android with deferred prompt -> prompts and accepts', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const promptFn = vi.fn();
    const userChoice = Promise.resolve({ outcome: 'accepted' });
    (window as unknown as { deferredPrompt: unknown }).deferredPrompt = {
      prompt: promptFn,
      userChoice,
    };

    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePwaInstall(onSuccess));
    await act(async () => {
      await result.current.handleInstall();
    });

    expect(promptFn).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('handleInstall: Android with deferred prompt -> dismissed', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const promptFn = vi.fn();
    const userChoice = Promise.resolve({ outcome: 'dismissed' });
    (window as unknown as { deferredPrompt: unknown }).deferredPrompt = {
      prompt: promptFn,
      userChoice,
    };

    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePwaInstall(onSuccess));
    await act(async () => {
      await result.current.handleInstall();
    });

    expect(promptFn).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('handleInstall: Android without deferred prompt -> shows prompt modal', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    delete (window as unknown as { deferredPrompt?: unknown }).deferredPrompt;

    const { result } = renderHook(() => usePwaInstall());
    await act(async () => {
      await result.current.handleInstall();
    });
    expect(result.current.showPrompt).toBe(true);
  });

  it('handleInstall: desktop (non-Android, non-iOS) -> shows prompt modal', async () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120');
    const { result } = renderHook(() => usePwaInstall());
    await act(async () => {
      await result.current.handleInstall();
    });
    expect(result.current.showPrompt).toBe(true);
  });

  it('handleConfirmInstall: iOS -> closes prompt without prompting browser', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605.1.15');
    const { result } = renderHook(() => usePwaInstall());
    act(() => {
      result.current.setShowPrompt(true);
    });
    expect(result.current.showPrompt).toBe(true);

    await act(async () => {
      await result.current.handleConfirmInstall();
    });
    expect(result.current.showPrompt).toBe(false);
  });

  it('handleConfirmInstall: deferred prompt available -> prompts and accepts', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const promptFn = vi.fn();
    const userChoice = Promise.resolve({ outcome: 'accepted' });
    (window as unknown as { deferredPrompt: unknown }).deferredPrompt = {
      prompt: promptFn,
      userChoice,
    };

    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePwaInstall(onSuccess));
    act(() => {
      result.current.setShowPrompt(true);
    });

    await act(async () => {
      await result.current.handleConfirmInstall();
    });

    expect(promptFn).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.showPrompt).toBe(false);
  });

  it('handleConfirmInstall: deferred prompt -> dismissed', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const promptFn = vi.fn();
    const userChoice = Promise.resolve({ outcome: 'dismissed' });
    (window as unknown as { deferredPrompt: unknown }).deferredPrompt = {
      prompt: promptFn,
      userChoice,
    };

    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePwaInstall(onSuccess));
    act(() => {
      result.current.setShowPrompt(true);
    });

    await act(async () => {
      await result.current.handleConfirmInstall();
    });

    expect(promptFn).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.showPrompt).toBe(false);
  });

  it('handleConfirmInstall: no deferred prompt -> just closes prompt', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    delete (window as unknown as { deferredPrompt?: unknown }).deferredPrompt;

    const { result } = renderHook(() => usePwaInstall());
    act(() => {
      result.current.setShowPrompt(true);
    });

    await act(async () => {
      await result.current.handleConfirmInstall();
    });
    expect(result.current.showPrompt).toBe(false);
  });

  it('registers beforeinstallprompt and appinstalled event listeners', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    renderHook(() => usePwaInstall());
    expect(registeredListeners['beforeinstallprompt'].length).toBeGreaterThanOrEqual(1);
    expect(registeredListeners['appinstalled'].length).toBeGreaterThanOrEqual(1);
  });

  it('appinstalled event clears prompt and calls onSuccess', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const onSuccess = vi.fn();

    renderHook(() => usePwaInstall(onSuccess));

    const installedHandler = registeredListeners['appinstalled'][0];
    expect(installedHandler).toBeDefined();

    act(() => {
      installedHandler(new Event('appinstalled'));
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(localStorage.setItem).toHaveBeenCalledWith('barber_pwa_installed', 'true');
  });

  it('appinstalled without onSuccess callback does not throw', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    renderHook(() => usePwaInstall());

    const installedHandler = registeredListeners['appinstalled'][0];
    expect(installedHandler).toBeDefined();

    act(() => {
      installedHandler(new Event('appinstalled'));
    });
  });

  it('beforeinstallprompt event handler stores deferredPrompt', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    renderHook(() => usePwaInstall());

    const handler = registeredListeners['beforeinstallprompt'][0];
    expect(handler).toBeDefined();

    const mockEvent = new Event('beforeinstallprompt');
    const preventDefault = vi.fn();
    Object.defineProperty(mockEvent, 'preventDefault', { value: preventDefault });

    act(() => {
      handler(mockEvent);
    });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('has initial deferredPrompt from window.deferredPrompt', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const mockPrompt = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) };
    (window as unknown as { deferredPrompt: unknown }).deferredPrompt = mockPrompt;

    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.deferredPrompt).toBe(mockPrompt);
  });

  it('canInstall is false when standalone', () => {
    setStandalone(true);
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canInstall).toBe(false);
  });

  it('canInstall is true on Android with no issues', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canInstall).toBe(true);
  });

  it('canInstall is true on iOS (CriOS bug means isIOSChrome=false)', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0.0.0');
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canInstall).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => usePwaInstall());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function)
    );
  });
});
