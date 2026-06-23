import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (navigator as any).standalone === true;
    
    setIsInstalled(isStandalone);
    if (isStandalone) return;

    // 2. Check if dismissed recently
    const dismissedTime = localStorage.getItem('barber_pwa_dismissed');
    if (dismissedTime) {
      const diff = Date.now() - parseInt(dismissedTime, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (diff < sevenDays) {
        return; // Keep hidden
      }
    }

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Show banner on mobile devices after a small delay
    const isMobile = /iphone|ipad|ipod|android|webos|blackberry|iemobile|opera mini/i.test(userAgent);
    if (isMobile) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // 3 seconds delay for better UX
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isInstalled) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isInstalled]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('barber_pwa_dismissed', Date.now().toString());
  };

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-4 left-4 right-4 z-[999] max-w-sm mx-auto">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-[#111112]/95 border border-[#C5A059]/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-md rounded-2xl p-4 flex flex-col gap-3 text-left overflow-hidden"
        >
          {/* Subtle gold background glow */}
          <div className="absolute right-0 top-0 w-20 h-20 bg-[#C5A059]/[0.02] rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
            aria-label="Fechar aviso"
          >
            <X size={12} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C5A059] to-[#A68233] flex items-center justify-center text-black shrink-0">
              <Smartphone size={20} strokeWidth={2.5} />
            </div>
            <div className="pr-6">
              <h4 className="text-xs font-black uppercase text-white tracking-wider">
                Instale nosso Aplicativo
              </h4>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                Acesse agendamentos mais rápido e receba alertas direto na sua tela inicial!
              </p>
            </div>
          </div>

          {/* Dynamic installation actions */}
          <div className="pt-1.5 border-t border-white/[0.04]">
            {isIOS ? (
              // iOS Instructions
              <div className="space-y-2 text-[10px] text-zinc-400 leading-normal">
                <p className="font-semibold text-zinc-300">Como instalar no iPhone:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li className="flex items-center gap-1.5 flex-wrap">
                    Toque no botão de compartilhar 
                    <span className="inline-flex p-1 bg-white/[0.04] border border-white/[0.08] rounded-md text-zinc-300">
                      <Share size={10} />
                    </span> 
                    no Safari.
                  </li>
                  <li className="flex items-center gap-1.5 flex-wrap">
                    Role a lista e toque em 
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-zinc-300 font-bold">
                      <PlusSquare size={10} /> Adicionar à Tela de Início
                    </span>.
                  </li>
                </ol>
              </div>
            ) : (
              // Android Direct Install
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
                  Custo zero • Rápido e Seguro
                </span>
                {deferredPrompt ? (
                  <button
                    onClick={handleInstallAndroid}
                    className="h-9 px-4 rounded-xl bg-[#C5A059] hover:bg-[#A68233] text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-[0_4px_12px_rgba(197,160,89,0.15)]"
                  >
                    <Download size={11} strokeWidth={2.5} />
                    Instalar
                  </button>
                ) : (
                  <div className="text-[10px] text-zinc-500 text-right leading-tight">
                    Abra no Google Chrome <br />para instalar no seu Android
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PWAInstallBanner;
