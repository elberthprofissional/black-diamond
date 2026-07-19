import { useState, useEffect, useCallback } from 'react';
import { STORAGE_PWA_INSTALLED } from '../lib/constants';

interface UsePwaInstallReturn {
  /** Dispositivo é iPhone/iPad/iPod */
  isIOS: boolean;
  /** Dispositivo é Android (não iOS) */
  isAndroid: boolean;
  /** Navegador é Samsung Internet */
  isSamsung: boolean;
  /** Já está rodando como app instalado (standalone) */
  isStandalone: boolean;
  /** iOS + Chrome (CriOS) — não suporta instalação direta */
  isIOSChrome: boolean;
  /** Pode ser instalado (não está standalone e não é CriOS) */
  canInstall: boolean;
  /** Se o modal de instalação deve aparecer */
  showPrompt: boolean;
  /** Evento beforeinstallprompt (Chrome/Edge/Firefox Android) */
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
      localStorage.setItem(STORAGE_PWA_INSTALLED, 'true');
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
  const isAndroid = /android/.test(ua);
  const isSamsung = /samsung|samsungbrowser/.test(ua);
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
    if (isAndroid && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') onSuccess?.();
      setDeferredPrompt(null);
      return;
    }
    setShowPrompt(true);
  }, [isStandalone, isIOSChrome, isAndroid, deferredPrompt, onSuccess, onError]);

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
    isAndroid,
    isSamsung,
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
