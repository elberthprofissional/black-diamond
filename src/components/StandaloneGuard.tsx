import { type FC, type ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

function checkStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Quando o usuario esta no PWA e tenta acessar uma rota publica (via link compartilhado),
 * mostra uma tela amigavel com botao "Abrir no navegador" em vez de redirecionar pro admin.
 */
const StandaloneGuard: FC<{ children: ReactNode }> = ({ children }) => {
  const [isStandalone, setIsStandalone] = useState(checkStandalone);
  const location = useLocation();

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const handler = () => setIsStandalone(checkStandalone());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!isStandalone) return <>{children}</>;

  // Monta a URL completa pra abrir no navegador
  const browserUrl = window.location.origin + location.pathname + location.search;

  const handleOpenInBrowser = () => {
    // No Android/iOS, abre no navegador padrão
    window.location.href = browserUrl;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center">
          <ExternalLink size={28} className="text-[#C5A059]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-bold text-white">Abrir no navegador</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Esse link é pra clientes agendarem. Abra no navegador do celular pra continuar.
          </p>
        </div>

        <button
          onClick={handleOpenInBrowser}
          className="w-full py-3.5 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-sm rounded-xl transition-all active:scale-[0.98] cursor-pointer"
        >
          Abrir no navegador
        </button>

        <p className="text-[11px] text-zinc-600">{location.pathname}</p>
      </div>
    </div>
  );
};

export default StandaloneGuard;
