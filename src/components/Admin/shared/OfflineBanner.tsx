import { type FC } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  /** Se está mostrando dados do cache offline */
  isCached: boolean;
  /** Função pra tentar recarregar os dados */
  onRetry?: () => void;
}

const OfflineBanner: FC<OfflineBannerProps> = ({ isCached, onRetry }) => {
  if (!isCached) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
          <WifiOff size={14} className="text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-amber-300 leading-tight">Modo Offline</p>
          <p className="text-[10px] text-zinc-400 leading-tight truncate">
            Mostrando dados salvos anteriormente. Conecte-se à internet para atualizar.
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-all cursor-pointer text-[11px] font-medium text-zinc-300 hover:text-white shrink-0"
        >
          <RefreshCw size={11} />
          Tentar novamente
        </button>
      )}
    </div>
  );
};

export default OfflineBanner;
