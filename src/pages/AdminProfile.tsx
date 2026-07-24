import { type FC } from 'react';
import { Bell, Download, LogOut, Trash2 } from 'lucide-react';
import { useAdminProfileState } from '../hooks/useAdminProfileState';
import AdminLayout from '../components/Admin/AdminLayout';
import AdminProfileSettings from '../components/Admin/settings/AdminProfileSettings';
import ProfileMobile from '../components/Admin/shared/ProfileMobile';
import ProfileDesktopMetrics from '../components/Admin/shared/ProfileDesktopMetrics';
import LogoutConfirmModal from '../components/Admin/profile/LogoutConfirmModal';
import ResetDataModal from '../components/Admin/profile/ResetDataModal';
import HelpModal from '../components/Admin/settings/HelpModal';
import PwaInstallModal from '../components/PwaInstallModal';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import { SkeletonDashboard } from '../components/Skeleton';

const AdminProfile: FC = () => {
  const p = useAdminProfileState();

  if (p.loading) {
    return (
      <div className="min-h-screen bg-[#000000] font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 lg:px-10 pt-24 lg:pt-8">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      mainClassName={`w-full mx-auto max-w-[1100px] space-y-6 ${p.showSettings ? 'px-0 sm:px-8 lg:px-10 pt-4 lg:pt-6 pb-24 lg:pb-12' : 'px-4 sm:px-6 lg:px-8 pt-20 lg:pt-8 pb-24 lg:pb-12'}`}
      hideNavbar={p.showSettings}
      hideBottomTabs={p.showSettings}
    >
      {/* Settings View */}
      {p.showSettings && (
        <AdminProfileSettings
          settingsSection={p.settingsSection}
          setSettingsSection={p.setSettingsSection}
          setShowHelp={p.setShowHelp}
          onLogoutClick={() => p.setShowLogoutConfirm(true)}
        />
      )}

      {/* Profile View - Desktop */}
      {!p.showSettings && (
        <ProfileDesktopMetrics
          greeting={p.greeting}
          barberName={p.barberName}
          barberPhoto={p.barberPhoto}
          onLogout={() => p.setShowLogoutConfirm(true)}
        />
      )}

      {/* Profile View - Mobile */}
      {!p.showSettings && (
        <ProfileMobile
          greeting={p.greeting}
          barberName={p.barberName}
          barberPhoto={p.barberPhoto}
          quickActions={[
            { label: 'Notificar', icon: Bell, onClick: p.handleToggleNotifications, active: p.isSubscribed },
            { label: 'Limpar', icon: Trash2, onClick: () => p.setShowResetConfirm(true) },
            { label: 'Aplicativo', icon: Download, onClick: p.handleInstallClick },
            { label: 'Sair', icon: LogOut, onClick: () => p.setShowLogoutConfirm(true) },
          ]}
        />
      )}

      {/* Modals */}
      <LogoutConfirmModal
        open={p.showLogoutConfirm}
        onConfirm={p.handleLogout}
        onCancel={() => p.setShowLogoutConfirm(false)}
      />
      <PwaInstallModal
        open={p.showInstallPrompt}
        isIOS={p.isIOS}
        isAndroid={p.isAndroid}
        isSamsung={p.isSamsung}
        hasDeferredPrompt={!!p.deferredPrompt}
        onClose={() => p.setShowInstallPrompt(false)}
        onConfirm={p.handleConfirmInstall}
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
      <HelpModal isOpen={p.showHelp} onClose={() => p.setShowHelp(false)} />
      <ToastNotification toast={p.toast} />
    </AdminLayout>
  );
};

export default AdminProfile;
