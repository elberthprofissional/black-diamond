import { useState, useEffect, useRef, lazy, Suspense, type FC } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { deleteAllClients } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../lib/utils';
import {
  Download,
  LogOut,
  Bell,
  Trash2,
  Scissors,
  User,
  ArrowLeft,
  Shield,
  Clock,
  Image as ImageIcon,
  HelpCircle,
  Crown,
  UserX,
  Gift,
  Tag,
  MessageSquare,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../components/Admin/AdminLayout';
import { useAdminLogout } from '../hooks/useAdminLogout';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import { useToast } from '../hooks/useToast';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { useProfileStats } from '../hooks/useProfileStats';

import ProfileMobile from '../components/Admin/shared/ProfileMobile';
import ProfileDesktopMetrics from '../components/Admin/shared/ProfileDesktopMetrics';
import ProfileServicesChart from '../components/Admin/shared/ProfileServicesChart';
import ExportButton from '../components/Admin/shared/ExportButton';
import LogoutConfirmModal from '../components/Admin/profile/LogoutConfirmModal';
import ResetDataModal from '../components/Admin/profile/ResetDataModal';
const SettingsConta = lazy(() => import('../components/Admin/settings/SettingsConta'));
const SettingsGaleria = lazy(() => import('../components/Admin/settings/SettingsGaleria'));
const SettingsNotificacoes = lazy(
  () => import('../components/Admin/settings/SettingsNotificacoes')
);
const SettingsDados = lazy(() => import('../components/Admin/settings/SettingsDados'));
const SettingsServicos = lazy(() => import('../components/Admin/settings/SettingsServicos'));
const SettingsHorarios = lazy(() => import('../components/Admin/settings/SettingsHorarios'));
const SettingsMensalista = lazy(() => import('../components/Admin/settings/SettingsMensalista'));
const SettingsFaltas = lazy(() => import('../components/Admin/settings/SettingsFaltas'));
const SettingsFidelidade = lazy(() => import('../components/Admin/settings/SettingsFidelidade'));
const SettingsCupons = lazy(() => import('../components/Admin/settings/SettingsCupons'));
const SettingsDepoimentos = lazy(() => import('../components/Admin/settings/SettingsDepoimentos'));
const SettingsBarbeiros = lazy(() => import('../components/Admin/settings/SettingsBarbeiros'));
import SettingsList from '../components/Admin/settings/SettingsList';
import HelpModal from '../components/Admin/settings/HelpModal';
import { SkeletonDashboard } from '../components/Skeleton';
import { usePwaInstall } from '../hooks/usePwaInstall';
import PwaInstallModal from '../components/PwaInstallModal';
import { logError } from '../lib/logger';

const AdminProfile: FC = () => {
  const [searchParams] = useSearchParams();
  const showSettings = searchParams.get('tab') === 'settings';
  const { stats, loading, loadData } = useProfileStats();
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [showBalance, setShowBalance] = useState(
    () => localStorage.getItem('barber_show_balance') !== 'false'
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { toast, showSuccess, showError } = useToast();

  const {
    isIOS,
    isAndroid,
    isSamsung,
    isStandalone,
    showPrompt: showInstallPrompt,
    deferredPrompt,
    setShowPrompt: setShowInstallPrompt,
    handleInstall: handleInstallClick,
    handleConfirmInstall,
  } = usePwaInstall(
    () => showSuccess('Aplicativo instalado!'),
    (msg) => showError(msg)
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState('');
  const [resetStep, setResetStep] = useState<'confirm' | 'password'>('confirm');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetting, setResetting] = useState(false);
  const handleLogout = useAdminLogout();
  const { isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const { barberName, barberPhoto } = useBarberSettings();
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const enteredSection = useRef(false);
  const navigate = useNavigate();

  // Quando ENTRA numa sub-seção pela primeira vez (ex: null → 'galeria'),
  // empurra UM estado no histórico pra interceptar o botão de voltar
  // Se já está numa sub-seção e muda pra outra, NÃO empurra de novo
  useEffect(() => {
    if (settingsSection && settingsSection !== '__back' && !enteredSection.current) {
      window.history.pushState({ section: settingsSection }, '');
      enteredSection.current = true;
    }
    if (!settingsSection) {
      enteredSection.current = false;
    }
  }, [settingsSection]);

  // Intercepta o botão de voltar do navegador/celular
  // Volta pra lista de configurações sem poluir o histórico
  useEffect(() => {
    const handlePopState = () => {
      if (settingsSection) {
        setSettingsSection(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [settingsSection]);

  useEffect(() => {
    if (settingsSection === '__back') {
      navigate('/admin/profile');
    }
  }, [settingsSection, navigate]);

  const greeting =
    new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 lg:px-10 pt-24 lg:pt-8">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  const currentConcluidos = timeRange === 'week' ? stats.concluidosSemana : stats.concluidosMes;
  const currentCancelados = timeRange === 'week' ? stats.canceladosSemana : stats.canceladosMes;

  const isIOSNotInstalled = isIOS && !isStandalone;

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
      showSuccess('Notificações desativadas');
      return;
    }
    if (isIOSNotInstalled) {
      showError('Para ativar as notificações, instale o aplicativo');
      return;
    }
    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      showError('Chave VAPID não configurada no servidor');
      return;
    }
    if (!('Notification' in window)) {
      showError('Seu navegador não suporta notificações');
      return;
    }
    if (Notification.permission === 'denied') {
      showError('Notificações bloqueadas. Permita nas configurações do navegador');
      return;
    }
    const success = await subscribe();
    if (success) showSuccess('Notificações ativadas!');
    else showError('Erro ao ativar notificações');
  };

  const quickActions = [
    { label: 'Notificar', icon: Bell, onClick: handleToggleNotifications, active: isSubscribed },
    { label: 'Limpar', icon: Trash2, onClick: () => setShowResetConfirm(true) },
    { label: 'Aplicativo', icon: Download, onClick: handleInstallClick },
    { label: 'Sair', icon: LogOut, onClick: () => setShowLogoutConfirm(true) },
  ];

  const handleResetData = async () => {
    if (resetStep === 'confirm') {
      setResetStep('password');
      return;
    }
    // Verify password
    setResetPasswordError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (!email) {
        setResetPasswordError('Sessão expirada.');
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password: resetPassword });
      if (error) {
        setResetPasswordError('Senha incorreta.');
        return;
      }
    } catch (e) {
      logError(e);
      setResetPasswordError('Erro ao verificar senha.');
      return;
    }
    setResetting(true);
    try {
      await deleteAllClients();
      showSuccess('Dados limpos com sucesso!');
      setShowResetConfirm(false);
      setResetText('');
      setResetStep('confirm');
      setResetPassword('');
      await loadData();
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setResetting(false);
    }
  };

  return (
    <AdminLayout
      mainClassName={`flex-1 w-full overflow-x-hidden px-0 sm:px-8 lg:px-10 ${showSettings ? 'pt-4 lg:pt-6' : 'pt-20 lg:pt-8'} pb-24 lg:pb-12 space-y-6 text-left font-sans`}
      hideNavbar={showSettings}
      hideBottomTabs={showSettings}
    >
      {/* SETTINGS VIEW */}
      {showSettings && (
        <>
          <div className="lg:hidden flex items-center gap-3 px-4 -mt-1 mb-4">
            <button
              onClick={() => {
                if (settingsSection) setSettingsSection(null);
                else setSettingsSection('__back');
              }}
              className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold tracking-tight text-white">
                {settingsSection === 'conta'
                  ? 'Conta'
                  : settingsSection === 'galeria'
                    ? 'Galeria'
                    : settingsSection === 'servicos'
                      ? 'Serviços'
                      : settingsSection === 'horarios'
                        ? 'Horários'
                        : settingsSection === 'mensalista'
                          ? 'Mensalista'
                          : settingsSection === 'faltas'
                            ? 'Controle de Faltas'
                            : settingsSection === 'barbeiros'
                              ? 'Barbeiros'
                              : settingsSection === 'fidelidade'
                                ? 'Fidelidade'
                                : settingsSection === 'cupons'
                                  ? 'Cupons'
                                  : settingsSection === 'depoimentos'
                                    ? 'Depoimentos'
                                    : settingsSection === 'notificacoes'
                                      ? 'Notificações'
                                      : settingsSection === 'dados'
                                        ? 'Zona de Segurança'
                                        : 'Configurações'}
              </h1>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="text-zinc-500 hover:text-[#D4AF37] transition-colors cursor-pointer"
              aria-label="Ajuda"
            >
              <HelpCircle size={20} />
            </button>
          </div>

          <div className="lg:hidden">
            {settingsSection === null && (
              <SettingsList
                onSelect={setSettingsSection}
                onLogoutClick={() => setShowLogoutConfirm(true)}
              />
            )}
            <Suspense fallback={<div className="h-32 bg-white/[0.02] rounded-xl animate-pulse" />}>
              {settingsSection === 'conta' && <SettingsConta />}
              {settingsSection === 'galeria' && <SettingsGaleria />}
              {settingsSection === 'servicos' && <SettingsServicos />}
              {settingsSection === 'horarios' && <SettingsHorarios />}
              {settingsSection === 'barbeiros' && <SettingsBarbeiros />}
              {settingsSection === 'mensalista' && <SettingsMensalista />}
              {settingsSection === 'faltas' && <SettingsFaltas />}
              {settingsSection === 'fidelidade' && <SettingsFidelidade />}
              {settingsSection === 'cupons' && <SettingsCupons />}
              {settingsSection === 'depoimentos' && <SettingsDepoimentos />}
              {settingsSection === 'notificacoes' && <SettingsNotificacoes />}
              {settingsSection === 'dados' && <SettingsDados />}
            </Suspense>
          </div>

          <div className="hidden lg:flex gap-8 max-w-4xl mx-auto items-start">
            <div className="w-[200px] shrink-0 sticky top-6 self-start">
              <div className="space-y-1">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-3 mb-4">
                  Configurações
                </h2>
                {[
                  { id: 'conta', label: 'Conta', icon: User },
                  { id: 'galeria', label: 'Galeria', icon: ImageIcon },
                  { id: 'servicos', label: 'Serviços', icon: Scissors },
                  { id: 'horarios', label: 'Horários', icon: Clock },
                  { id: 'barbeiros', label: 'Barbeiros', icon: Users },
                  { id: 'mensalista', label: 'Mensalista', icon: Crown },
                  { id: 'faltas', label: 'Controle de Faltas', icon: UserX },
                  { id: 'fidelidade', label: 'Fidelidade', icon: Gift },
                  { id: 'cupons', label: 'Cupons', icon: Tag },
                  { id: 'depoimentos', label: 'Depoimentos', icon: MessageSquare },
                  { id: 'notificacoes', label: 'Notificações', icon: Bell },
                  { id: 'dados', label: 'Segurança', icon: Shield },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = (settingsSection || 'conta') === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSettingsSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all cursor-pointer ${active ? 'bg-white/5 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'}`}
                    >
                      <Icon size={15} className={active ? 'text-[#D4AF37]' : 'text-zinc-500'} />
                      {item.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowHelp(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-all cursor-pointer mt-4"
                >
                  <HelpCircle size={15} />
                  Ajuda
                </button>
              </div>
            </div>
            <div className="flex-1 min-w-0 min-h-[600px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={settingsSection || 'conta'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <Suspense
                    fallback={<div className="h-32 bg-white/[0.02] rounded-xl animate-pulse" />}
                  >
                    {(!settingsSection || settingsSection === 'conta') && <SettingsConta />}
                    {settingsSection === 'galeria' && <SettingsGaleria />}
                    {settingsSection === 'servicos' && <SettingsServicos />}
                    {settingsSection === 'horarios' && <SettingsHorarios />}
                    {settingsSection === 'barbeiros' && <SettingsBarbeiros />}
                    {settingsSection === 'mensalista' && <SettingsMensalista />}
                    {settingsSection === 'faltas' && <SettingsFaltas />}
                    {settingsSection === 'fidelidade' && <SettingsFidelidade />}
                    {settingsSection === 'cupons' && <SettingsCupons />}
                    {settingsSection === 'depoimentos' && <SettingsDepoimentos />}
                    {settingsSection === 'notificacoes' && <SettingsNotificacoes />}
                    {settingsSection === 'dados' && <SettingsDados />}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {/* DESKTOP LAYOUT */}
      {!showSettings && (
        <ProfileDesktopMetrics
          greeting={greeting}
          barberName={barberName}
          barberPhoto={barberPhoto}
          lucroTotal={stats.lucroTotal}
          lucroSemana={stats.lucroSemana}
          lucroMes={stats.lucroMes}
          currentConcluidos={currentConcluidos}
          currentCancelados={currentCancelados}
          onLogout={() => setShowLogoutConfirm(true)}
        />
      )}

      {/* EXPORT BUTTON — desktop */}
      {!showSettings && (
        <div className="hidden lg:flex justify-end px-8 -mt-4 mb-2">
          <ExportButton />
        </div>
      )}

      {/* DESKTOP SERVICES CHART */}
      {!showSettings && (
        <div className="hidden lg:block">
          <ProfileServicesChart topServices={stats.topServices} />
        </div>
      )}

      {/* MOBILE LAYOUT */}
      {!showSettings && (
        <ProfileMobile
          greeting={greeting}
          barberName={barberName}
          barberPhoto={barberPhoto}
          showBalance={showBalance}
          toggleBalance={() => {
            setShowBalance((prev) => {
              localStorage.setItem('barber_show_balance', String(!prev));
              return !prev;
            });
          }}
          lucroTotal={stats.lucroTotal}
          lucroSemana={stats.lucroSemana}
          lucroMes={stats.lucroMes}
          currentConcluidos={currentConcluidos}
          currentCancelados={currentCancelados}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          topServices={stats.topServices}
          quickActions={quickActions}
        />
      )}

      {/* Modals */}
      <LogoutConfirmModal
        open={showLogoutConfirm}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <PwaInstallModal
        open={showInstallPrompt}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isSamsung={isSamsung}
        hasDeferredPrompt={!!deferredPrompt}
        onClose={() => setShowInstallPrompt(false)}
        onConfirm={handleConfirmInstall}
      />

      <ResetDataModal
        open={showResetConfirm}
        step={resetStep}
        resetText={resetText}
        resetPassword={resetPassword}
        resetPasswordError={resetPasswordError}
        resetting={resetting}
        onResetTextChange={setResetText}
        onResetPasswordChange={(val) => {
          setResetPassword(val);
          setResetPasswordError('');
        }}
        onConfirm={handleResetData}
        onClose={() => {
          setShowResetConfirm(false);
          setResetText('');
          setResetStep('confirm');
          setResetPassword('');
          setResetPasswordError('');
        }}
        onBack={() => {
          if (resetStep === 'password') {
            setResetStep('confirm');
            setResetPassword('');
            setResetPasswordError('');
          } else {
            setShowResetConfirm(false);
            setResetText('');
          }
        }}
      />

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminProfile;
