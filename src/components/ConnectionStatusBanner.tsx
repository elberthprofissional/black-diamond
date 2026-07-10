import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { WifiOff } from 'lucide-react';

export default function ConnectionStatusBanner() {
  const { status, checkConnection: refetch } = useConnectionStatus();

  if (status === 'connected') return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-center gap-3 backdrop-blur-sm"
    >
      <WifiOff size={14} className="text-amber-400 shrink-0" />
      <span className="text-xs font-medium text-amber-400">
        {status === 'disconnected'
          ? 'Sem conexão com a internet. Dados salvos no celular — você pode continuar navegando.'
          : 'Verificando conexão...'}
      </span>
      {status === 'disconnected' && (
        <button
          onClick={refetch}
          className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors cursor-pointer shrink-0"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
