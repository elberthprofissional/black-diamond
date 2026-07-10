import { useState, useEffect, useCallback } from 'react';

interface UsePwaInstallReturn {
  isIOS: boolean;
  isStandalone: boolean;
  isIOSChrome: boolean;
  canInstall: boolean;
  showPrompt: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  setShowPrompt: (v: boolean) => void;
  handleInstall: () => Promise<void>;
  handleConfirmInstall: () => Promise<void>;
}

export function usePwaInstall(
  onSuccess?: () => void,
  onError?: (msg: string) => void
): UsePwaInstallReturn {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt || null
  );

  useEffect(() => {
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt =
        undefined;
      localStorage.setItem('barber_pwa_installed', 'true');
      setShowPrompt(false);
      onSuccess?.();
    };
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, [onSuccess]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt =
        e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const isIOSChrome = isIOS && ua.includes('CriOS');

  const canInstall = !isStandalone && !isIOSChrome;

  const handleInstall = useCallback(async () => {
    if (isStandalone) {
      onError?.('Aplicativo já instalado!');
      return;
    }
    if (isIOSChrome) {
      onError?.('No iPhone, abra este link pelo Safari primeiro');
      return;
    }
    if (!isIOS && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') onSuccess?.();
      setDeferredPrompt(null);
      return;
    }
    setShowPrompt(true);
  }, [isStandalone, isIOSChrome, isIOS, deferredPrompt, onSuccess, onError]);

  const handleConfirmInstall = useCallback(async () => {
    if (isIOS) {
      setShowPrompt(false);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') onSuccess?.();
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  }, [isIOS, deferredPrompt, onSuccess]);

  return {
    isIOS,
    isStandalone,
    isIOSChrome,
    canInstall,
    showPrompt,
    deferredPrompt,
    setShowPrompt,
    handleInstall,
    handleConfirmInstall,
  };
}
