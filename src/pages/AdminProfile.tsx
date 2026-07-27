import { type FC } from 'react';
import { User, Bell, Lock, ChevronRight, Settings, LogOut, Trash2, Download } from 'lucide-react';
import { useAdminProfileState } from '../hooks/useAdminProfileState';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { usePwaInstall } from '../hooks/usePwaInstall';
import AdminLayout from '../components/Admin/AdminLayout';
import AdminProfileSettings from '../components/Admin/settings/AdminProfileSettings';
import LogoutConfirmModal from '../components/Admin/profile/LogoutConfirmModal';
import ResetDataModal from '../components/Admin/profile/ResetDataModal';
import ToastNotification from '../components/Admin/shared/ToastNotification';

const AdminProfile: FC = () => {
  const p = useAdminProfileState();
  const { barberPhone } = useBarberSettings();
  const { canInstall, isStandalone, handleInstall } = usePwaInstall();

  const formattedPhone = barberPhone
    ? `(${barberPhone.slice(0, 2)}) ${barberPhone.slice(2, 7)}-${barberPhone.slice(7)}`
    : 'Configurar WhatsApp';

  const sharedModals = (
    <>
      <LogoutConfirmModal
        open={p.showLogoutConfirm}
        onConfirm={p.handleLogout}
        onCancel={() => p.setShowLogoutConfirm(false)}
      />
      <ResetDataModal
        open={p.showResetConfirm}
        step={p.resetStep}
        resetText={p.resetText}
        resetPassword={p.resetPassword}
        resetPasswordError={p.resetPasswordError}
        resetting={p.resetting}
        onResetTextChange={p.setResetText}
        onResetPasswordChange={(val: string) => {
          p.setResetPassword(val);
          p.setResetPasswordError('');
        }}
        onConfirm={p.handleResetData}
        onClose={() => {
          p.setShowResetConfirm(false);
          p.setResetText('');
          p.setResetStep('confirm');
          p.setResetPassword('');
          p.setResetPasswordError('');
        }}
        onBack={() => {
          if (p.resetStep === 'password') {
            p.setResetStep('confirm');
            p.setResetPassword('');
            p.setResetPasswordError('');
          } else {
            p.setShowResetConfirm(false);
            p.setResetText('');
          }
        }}
      />
      <ToastNotification toast={p.toast} />
    </>
  );

  // ─── DESKTOP: Settings direto ──
  const desktopContent = (
    <div className="hidden lg:block">
      <AdminProfileSettings
        settingsSection={p.settingsSection}
        setSettingsSection={p.setSettingsSection}
      />
    </div>
  );

  // ─── MOBILE: Figma design — clean profile ──
  const mobileContent = (
    <div className="lg:hidden">
      {p.showSettings ? (
        <AdminProfileSettings
          settingsSection={p.settingsSection}
          setSettingsSection={p.setSettingsSection}
        />
      ) : (
        <div className="min-h-[calc(100vh-8rem)] flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Meu perfil</h1>
            <p className="text-[12px] text-zinc-500 mt-1">
              Veja suas informações e altere se necessário.
            </p>
          </div>

          {/* Avatar + Name */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full border-2 border-white/10 overflow-hidden bg-white/[0.03]">
                {p.barberPhoto ? (
                  <img
                    src={p.barberPhoto}
                    alt={p.barberName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={36} className="text-zinc-600" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-[#0A0A0A] rounded-full" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {p.barberName || 'Barbeiro'}
            </h2>
            <p className="text-[13px] text-zinc-500 mt-0.5">{formattedPhone}</p>
          </div>

          {/* Menu */}
          <div className="space-y-2">
            <button
              onClick={() => {
                p.setSettingsSection('conta');
                p.navigate('/admin/profile?tab=settings');
              }}
              className="w-full flex items-center gap-4 bg-[#111111] border border-white/5 rounded-xl px-5 py-4 transition-all cursor-pointer hover:bg-white/[0.02]"
            >
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <User size={16} className="text-zinc-400" />
              </div>
              <span className="flex-1 text-left text-[14px] font-medium text-white">
                Editar perfil
              </span>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>

            <button
              onClick={() => {
                p.setSettingsSection('dados');
                p.navigate('/admin/profile?tab=settings');
              }}
              className="w-full flex items-center gap-4 bg-[#111111] border border-white/5 rounded-xl px-5 py-4 transition-all cursor-pointer hover:bg-white/[0.02]"
            >
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <Lock size={16} className="text-zinc-400" />
              </div>
              <span className="flex-1 text-left text-[14px] font-medium text-white">
                Alterar senha
              </span>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>

            <button
              onClick={p.handleToggleNotifications}
              className="w-full flex items-center gap-4 bg-[#111111] border border-white/5 rounded-xl px-5 py-4 transition-all cursor-pointer hover:bg-white/[0.02]"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${p.isSubscribed ? 'bg-[#D4AF37]/10' : 'bg-white/[0.04]'}`}
              >
                <Bell size={16} className={p.isSubscribed ? 'text-[#D4AF37]' : 'text-zinc-400'} />
              </div>
              <span className="flex-1 text-left text-[14px] font-medium text-white">
                Notificações
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  p.isSubscribed
                    ? 'text-emerald-400 bg-emerald-400/10'
                    : 'text-zinc-500 bg-white/[0.04]'
                }`}
              >
                {p.isSubscribed ? 'Ativas' : 'Off'}
              </span>
            </button>

            {canInstall && !isStandalone && (
              <button
                onClick={handleInstall}
                className="w-full flex items-center gap-4 bg-[#111111] border border-white/5 rounded-xl px-5 py-4 transition-all cursor-pointer hover:bg-white/[0.02]"
              >
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                  <Download size={16} className="text-[#D4AF37]" />
                </div>
                <span className="flex-1 text-left text-[14px] font-medium text-white">
                  Instalar aplicativo
                </span>
                <ChevronRight size={16} className="text-zinc-600" />
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.04] my-6" />

          {/* Secondary actions */}
          <div className="space-y-2">
            <button
              onClick={() => {
                p.setSettingsSection(null);
                p.navigate('/admin/profile?tab=settings');
              }}
              className="w-full flex items-center gap-4 bg-[#111111] border border-white/5 rounded-xl px-5 py-4 transition-all cursor-pointer hover:bg-white/[0.02]"
            >
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <Settings size={16} className="text-zinc-400" />
              </div>
              <span className="flex-1 text-left text-[14px] font-medium text-white">
                Todas as configurações
              </span>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>
          </div>

          {/* Danger zone */}
          <div className="mt-auto pt-6 space-y-2">
            <button
              onClick={() => p.setShowResetConfirm(true)}
              className="w-full flex items-center gap-4 bg-[#111111] border border-white/5 rounded-xl px-5 py-4 transition-all cursor-pointer hover:bg-red-500/[0.04]"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 size={16} className="text-red-400" />
              </div>
              <span className="flex-1 text-left text-[14px] font-medium text-red-400">
                Limpar Dados
              </span>
            </button>

            <button
              onClick={() => p.setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-4 bg-[#111111] border border-white/5 rounded-xl px-5 py-4 transition-all cursor-pointer hover:bg-red-500/[0.04]"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <LogOut size={16} className="text-red-400" />
              </div>
              <span className="flex-1 text-left text-[14px] font-medium text-red-400">
                Sair da Conta
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout
      mainClassName="w-full mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10 pt-4 lg:pt-6 pb-24 lg:pb-12"
      hideNavbar
      hideBottomTabs
    >
      {desktopContent}
      {mobileContent}
      {sharedModals}
    </AdminLayout>
  );
};

export default AdminProfile;
