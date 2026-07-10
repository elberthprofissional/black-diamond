import { type FC } from 'react';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';

interface SettingsNotificacoesProps {
  onBack?: () => void;
}

const SettingsNotificacoes: FC<SettingsNotificacoesProps> = ({ onBack: _onBack }) => {
  const { isSubscribed, subscribe, unsubscribe, vapidMissing } = usePushNotifications();
  const { toast, showSuccess, showError } = useToast();

  if (vapidMissing) {
    return (
      <div className="space-y-6">
        <div className="w-full px-5 py-4 border border-amber-500/20 bg-amber-500/[0.04] rounded-2xl">
          <div className="flex items-center gap-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="text-left">
              <span className="text-[13px] text-amber-400 block font-medium">
                VAPID key não configurada
              </span>
              <span className="text-[11px] text-amber-500/70 block mt-0.5">
                Adicione VITE_VAPID_PUBLIC_KEY no .env para ativar notificações push.
              </span>
            </div>
          </div>
        </div>
        <ToastNotification toast={toast} />
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      showSuccess('Notificações desativadas');
    } else {
      const success = await subscribe();
      if (success) showSuccess('Notificações ativadas!');
      else showError('Erro ao ativar notificações');
    }
  };

  return (
    <div className="space-y-6">
      <div className="w-full">
        <button
          onClick={handleToggle}
          role="switch"
          aria-checked={isSubscribed}
          aria-label={`Notificações ${isSubscribed ? 'ativadas' : 'desativadas'}`}
          className="w-full flex items-center justify-between px-5 py-4 border border-white/[0.04] rounded-2xl hover:bg-white/[0.02] transition-all cursor-pointer"
        >
          <div className="text-left">
            <span className="text-[13px] text-white block font-medium">Notificações</span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              Receba alertas de novos agendamentos
            </span>
          </div>
          <div
            className={`w-11 h-6 rounded-full transition-all relative ${isSubscribed ? 'bg-[#C5A059]' : 'bg-zinc-700'}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSubscribed ? 'left-6' : 'left-1'}`}
            />
          </div>
        </button>
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsNotificacoes;
