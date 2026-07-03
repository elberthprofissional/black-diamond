import React from 'react';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';

interface SettingsNotificacoesProps {
  onBack?: () => void;
}

const SettingsNotificacoes: React.FC<SettingsNotificacoesProps> = () => {
  const { isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const { toast, showSuccess, showError } = useToast();

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
          className="w-full flex items-center justify-between px-5 py-4 border border-white/[0.04] rounded-2xl hover:bg-white/[0.02] transition-all cursor-pointer"
        >
          <div className="text-left">
            <span className="text-[13px] text-white block font-medium">Notificações</span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">Receba alertas de novos agendamentos</span>
          </div>
          <div className={`w-11 h-6 rounded-full transition-all relative ${isSubscribed ? 'bg-[#C5A059]' : 'bg-zinc-700'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSubscribed ? 'left-6' : 'left-1'}`} />
          </div>
        </button>
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsNotificacoes;
