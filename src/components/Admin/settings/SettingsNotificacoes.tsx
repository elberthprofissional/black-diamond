import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';

interface SettingsNotificacoesProps {
  onBack: () => void;
}

const SettingsNotificacoes: React.FC<SettingsNotificacoesProps> = ({ onBack }) => {
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
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Voltar"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">Notificações</h1>
      </div>

      {/* Toggle */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
        >
          <div className="text-left">
            <span className="text-[13px] text-white block">Notificações push</span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">Receba alertas quando alguém agendar</span>
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
