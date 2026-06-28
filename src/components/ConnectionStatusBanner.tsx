import { useConnectionStatus } from '../hooks/useConnectionStatus';

export default function ConnectionStatusBanner() {
  const { status } = useConnectionStatus();

  if (status === 'connected') return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[9999] bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-center gap-2 backdrop-blur-sm"
    >
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-xs font-medium text-red-400">
        {status === 'disconnected'
          ? 'Sem conexão com o servidor. Tente novamente.'
          : 'Verificando conexão...'}
      </span>
    </div>
  );
}
