import { type FC } from 'react';
import { Bell, Volume2, Eye, Hash, ExternalLink, RotateCcw } from 'lucide-react';
import { useNotificationPrefs } from '../../../hooks/useNotificationPrefs';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';

interface SettingsNotificacoesProps {
  onBack?: () => void;
}

interface ToggleRowProps {
  icon: typeof Bell;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
}

const ToggleRow: FC<ToggleRowProps> = ({
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
  disabled = false,
  loading = false,
}) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled || loading}
    role="switch"
    aria-checked={checked}
    className={`w-full flex items-center justify-between px-5 py-4 border border-white/[0.04] rounded-2xl transition-all cursor-pointer ${
      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/[0.02]'
    }`}
  >
    <div className="flex items-center gap-3.5 min-w-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          checked ? 'bg-[#C5A059]/10' : 'bg-white/[0.03]'
        }`}
      >
        <Icon size={15} className={checked ? 'text-[#C5A059]' : 'text-zinc-600'} />
      </div>
      <div className="text-left">
        <span className="text-[13px] text-white block font-medium">{label}</span>
        <span className="text-[11px] text-zinc-500 block mt-0.5">{desc}</span>
      </div>
    </div>
    <div
      className={`w-11 h-6 rounded-full transition-all relative shrink-0 ml-3 ${
        loading ? 'opacity-50' : ''
      } ${checked ? 'bg-[#C5A059]' : 'bg-zinc-700'}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </div>
  </button>
);

const SettingsNotificacoes: FC<SettingsNotificacoesProps> = ({ onBack: _onBack }) => {
  const { prefs, loading: prefsLoading, updatePref, resetPrefs } = useNotificationPrefs();
  const { isSubscribed, subscribe, unsubscribe, vapidMissing } = usePushNotifications();
  const { toast, showSuccess, showError } = useToast();

  const handlePushToggle = async () => {
    if (vapidMissing) {
      showError('VAPID key não configurada. Adicione VITE_VAPID_PUBLIC_KEY no .env');
      return;
    }
    if (isSubscribed) {
      await unsubscribe();
      showSuccess('Push desativado');
    } else {
      const success = await subscribe();
      if (success) showSuccess('Push ativado!');
      else showError('Erro ao ativar push');
    }
  };

  const handleReset = async () => {
    const ok = await resetPrefs();
    if (ok) showSuccess('Preferências restauradas');
    else showError('Erro ao restaurar');
  };

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

        {/* Still show preference toggles even without VAPID */}
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-1 mb-3">
            Preferências do App
          </p>
          <ToggleRow
            icon={Bell}
            label="Notificações no app"
            desc="Aparecer no sininho e na lista de notificações"
            checked={prefs.inApp}
            onChange={(v) => updatePref('inApp', v)}
            loading={prefsLoading}
          />
          <ToggleRow
            icon={Volume2}
            label="Som"
            desc="Tocar som ao receber nova notificação"
            checked={prefs.sound}
            onChange={(v) => updatePref('sound', v)}
            disabled={!prefs.inApp}
            loading={prefsLoading}
          />
          <ToggleRow
            icon={Eye}
            label="Preview"
            desc="Mostrar prévia da notificação na tela"
            checked={prefs.preview}
            onChange={(v) => updatePref('preview', v)}
            disabled={!prefs.inApp}
            loading={prefsLoading}
          />
          <ToggleRow
            icon={Hash}
            label="Badge no título"
            desc="Mostrar contador de não lidas na aba"
            checked={prefs.badge}
            onChange={(v) => updatePref('badge', v)}
            disabled={!prefs.inApp}
            loading={prefsLoading}
          />
        </div>

        {/* Reset */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all cursor-pointer"
          >
            <RotateCcw size={12} />
            Restaurar padrões
          </button>
        </div>

        <ToastNotification toast={toast} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-1 mb-3">
          Preferências do App
        </p>
        <ToggleRow
          icon={Bell}
          label="Notificações no app"
          desc="Aparecer no sininho e na lista de notificações"
          checked={prefs.inApp}
          onChange={(v) => updatePref('inApp', v)}
          loading={prefsLoading}
        />
        <ToggleRow
          icon={Volume2}
          label="Som"
          desc="Tocar som ao receber nova notificação"
          checked={prefs.sound}
          onChange={(v) => updatePref('sound', v)}
          disabled={!prefs.inApp}
          loading={prefsLoading}
        />
        <ToggleRow
          icon={Eye}
          label="Preview"
          desc="Mostrar prévia da notificação na tela"
          checked={prefs.preview}
          onChange={(v) => updatePref('preview', v)}
          disabled={!prefs.inApp}
          loading={prefsLoading}
        />
        <ToggleRow
          icon={Hash}
          label="Badge no título"
          desc="Mostrar contador de não lidas na aba"
          checked={prefs.badge}
          onChange={(v) => updatePref('badge', v)}
          disabled={!prefs.inApp}
          loading={prefsLoading}
        />
      </div>

      <div className="h-px bg-white/[0.04] mx-1" />

      <div className="space-y-1">
        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-1 mb-3">
          Push Notification
        </p>
        <ToggleRow
          icon={ExternalLink}
          label="Notificações Push"
          desc="Alertas mesmo com o navegador fechado"
          checked={isSubscribed}
          onChange={handlePushToggle}
        />
      </div>

      {/* Reset */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all cursor-pointer"
        >
          <RotateCcw size={12} />
          Restaurar padrões
        </button>
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsNotificacoes;
