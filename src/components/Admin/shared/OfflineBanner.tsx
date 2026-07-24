import { type FC, useMemo } from 'react';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';

interface OfflineBannerProps {
  /** Se está mostrando dados do cache offline */
  isCached: boolean;
  /** Função pra tentar recarregar os dados */
  onRetry?: () => void;
}

const OfflineBanner: FC<OfflineBannerProps> = ({ isCached, onRetry }) => {
  const lastUpdate = useMemo(() => {
    try {
      const stored = localStorage.getItem('bd_bookings_cache');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed.timestamp) {
        const d = new Date(parsed.timestamp);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    } catch {
      /* ignore */
    }
    return null;
  }, []);

  if (!isCached) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
          <WifiOff size={14} className="text-amber-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[12px] font-medium text-amber-300 leading-tight">Modo Offline</p>
            <span className="text-[9px] text-zinc-600">—</span>
            <CheckCircle size={10} className="text-emerald-500" />
            <p className="text-[10px] text-emerald-400 leading-tight">Dados salvos no celular</p>
          </div>
          <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">
            {lastUpdate
              ? `Última atualização: ${lastUpdate}. Os dados serão atualizados automaticamente quando a rede voltar.`
              : 'Os dados serão atualizados automaticamente quando a rede voltar.'}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-all cursor-pointer text-[12px] font-medium text-zinc-300 hover:text-white shrink-0"
        >
          <RefreshCw size={11} />
          Tentar
        </button>
      )}
    </div>
  );
};

export default OfflineBanner;
