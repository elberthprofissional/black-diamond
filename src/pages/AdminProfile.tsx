import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { deleteAllClients } from '../lib/api';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../components/Admin/AdminLayout';
import { useAdminLogout } from '../hooks/useAdminLogout';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import { useToast } from '../hooks/useToast';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useBarberSettings } from '../contexts/BarberSettingsContext';
import { useProfileStats } from '../hooks/useProfileStats';
import { useWeeklyCongrats } from '../hooks/useWeeklyCongrats';
import ProfileMobile from '../components/Admin/shared/ProfileMobile';
import ProfileDesktopMetrics from '../components/Admin/shared/ProfileDesktopMetrics';
import ProfileServicesChart from '../components/Admin/shared/ProfileServicesChart';
import SettingsList from '../components/Admin/settings/SettingsList';
import SettingsConta from '../components/Admin/settings/SettingsConta';
import SettingsGaleria from '../components/Admin/settings/SettingsGaleria';
import SettingsNotificacoes from '../components/Admin/settings/SettingsNotificacoes';
import SettingsDados from '../components/Admin/settings/SettingsDados';
import SettingsServicos from '../components/Admin/settings/SettingsServicos';
import SettingsHorarios from '../components/Admin/settings/SettingsHorarios';
import { SkeletonDashboard } from '../components/Skeleton';

const AdminProfile: React.FC = () => {
  const [searchParams] = useSearchParams();
  const showSettings = searchParams.get('tab') === 'settings';
  const { stats, loading, loadData } = useProfileStats();
  useWeeklyCongrats(stats.lucroSemana, stats.concluidosSemana);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [showBalance, setShowBalance] = useState(
    () => localStorage.getItem('barber_show_balance') !== 'false'
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    window.deferredPrompt || null
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState('');
  const [resetting, setResetting] = useState(false);
  const handleLogout = useAdminLogout();
  const { toast, showSuccess, showError } = useToast();
  const { isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const { barberName, barberPhoto, refetch } = useBarberSettings();
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
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

  useEffect(() => {
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      window.deferredPrompt = undefined;
      localStorage.setItem('barber_pwa_installed', 'true');
      setShowInstallPrompt(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      window.deferredPrompt = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

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

  const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const isIOSChrome = isIOS && window.navigator.userAgent.includes('CriOS');
  const isIOSNotInstalled = isIOS && !isStandalone;

  const handleInstallClick = async () => {
    if (isStandalone) {
      showSuccess('Aplicativo já instalado!');
      return;
    }
    if (isIOSChrome) {
      showError('No iPhone, abra este link pelo Safari primeiro');
      return;
    }
    // Se o prompt automático do navegador estiver pronto, dispara direto!
    if (!isIOS && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') showSuccess('Aplicativo instalado!');
      setDeferredPrompt(null);
      return;
    }
    // Caso contrário (iOS ou Android com prompt manual), abre o modal com orientações
    setShowInstallPrompt(true);
  };

  const handleConfirmInstall = async () => {
    if (isIOS) {
      setShowInstallPrompt(false);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') showSuccess('Aplicativo instalado!');
      setDeferredPrompt(null);
    }
    setShowInstallPrompt(false);
  };

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
    setResetting(true);
    try {
      await deleteAllClients();
      showSuccess('Dados limpos com sucesso!');
      setShowResetConfirm(false);
      setResetText('');
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
                        : settingsSection === 'notificacoes'
                          ? 'Notificações'
                          : settingsSection === 'dados'
                            ? 'Zona de Segurança'
                            : 'Configurações'}
              </h1>
            </div>
          </div>

          <div className="lg:hidden">
            {settingsSection === null && <SettingsList onSelect={setSettingsSection} />}
            {settingsSection === 'conta' && <SettingsConta />}
            {settingsSection === 'galeria' && <SettingsGaleria />}
            {settingsSection === 'servicos' && <SettingsServicos />}
            {settingsSection === 'horarios' && <SettingsHorarios />}
            {settingsSection === 'notificacoes' && <SettingsNotificacoes />}
            {settingsSection === 'dados' && <SettingsDados />}
          </div>

          <div className="hidden lg:flex gap-8 max-w-4xl mx-auto">
            <div className="w-[200px] shrink-0">
              <div className="sticky top-6 space-y-1">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-3 mb-4">
                  Configurações
                </h2>
                {[
                  { id: 'conta', label: 'Conta', icon: User },
                  { id: 'galeria', label: 'Galeria', icon: ImageIcon },
                  { id: 'servicos', label: 'Serviços', icon: Scissors },
                  { id: 'horarios', label: 'Horários', icon: Clock },
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
                      <Icon size={15} className={active ? 'text-[#C5A059]' : 'text-zinc-500'} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 min-w-0 min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={settingsSection || 'conta'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {(!settingsSection || settingsSection === 'conta') && <SettingsConta />}
                  {settingsSection === 'galeria' && <SettingsGaleria />}
                  {settingsSection === 'servicos' && <SettingsServicos />}
                  {settingsSection === 'horarios' && <SettingsHorarios />}
                  {settingsSection === 'notificacoes' && <SettingsNotificacoes />}
                  {settingsSection === 'dados' && <SettingsDados />}
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
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-[260px] bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="p-5 text-center">
                <p className="text-[11px] text-zinc-300 font-medium">Sair da conta?</p>
              </div>
              <div className="border-t border-white/[0.06]">
                <button
                  onClick={handleLogout}
                  className="w-full py-3.5 text-[11px] font-bold text-red-500 active:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  Sair
                </button>
              </div>
              <div className="border-t border-white/[0.06]">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-3.5 text-[11px] font-bold text-zinc-300 active:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  Manter
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstallPrompt && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallPrompt(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative z-10 w-full sm:max-w-[340px] bg-[#1C1C1E] sm:rounded-2xl rounded-t-2xl overflow-hidden"
            >
              {isIOS || (!isIOS && !deferredPrompt) ? (
                <>
                  <div className="px-6 pt-6 pb-4">
                    <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto mb-4">
                      <Download size={20} className="text-[#C5A059]" />
                    </div>
                    <p className="text-[15px] font-semibold text-white text-center">
                      Instalar o app
                    </p>
                    <p className="text-[12px] text-zinc-500 mt-2 text-center leading-relaxed">
                      Siga os passos abaixo para adicionar o app à sua tela de início.
                    </p>
                  </div>
                  <div className="px-6 pb-5 space-y-4">
                    {isIOS
                      ? [
                          'Toque no ícone de Compartilhar — é o quadrado com seta pra cima, na parte de baixo da tela.',
                          'Role pra baixo e toque em Adicionar à Tela de Início.',
                          'Confirme tocando em Adicionar no canto superior direito. Pronto!',
                        ].map((text, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#C5A059]/10 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-[#C5A059]">{i + 1}</span>
                            </div>
                            <p className="text-[12px] text-zinc-400 leading-relaxed">{text}</p>
                          </div>
                        ))
                      : [
                          'Abra o menu do Chrome tocando nos três pontinhos no canto superior direito.',
                          'Role a lista e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".',
                          'Confirme tocando em Instalar / Adicionar. Pronto!',
                        ].map((text, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#C5A059]/10 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-[#C5A059]">{i + 1}</span>
                            </div>
                            <p className="text-[12px] text-zinc-400 leading-relaxed">{text}</p>
                          </div>
                        ))}
                  </div>
                </>
              ) : (
                <div className="px-6 pt-6 pb-4">
                  <p className="text-[15px] font-semibold text-white">Instalar aplicativo</p>
                  <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                    Adicione o Black Diamond à sua tela de início para acesso rápido.
                  </p>
                </div>
              )}
              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => setShowInstallPrompt(false)}
                  className="flex-1 py-4 text-[13px] font-medium text-zinc-400 hover:text-white active:bg-white/[0.03] transition-all cursor-pointer"
                >
                  {isIOS || (!isIOS && !deferredPrompt) ? 'Entendi' : 'Cancelar'}
                </button>
                {!isIOS && deferredPrompt && (
                  <>
                    <div className="w-px bg-white/[0.06]" />
                    <button
                      onClick={handleConfirmInstall}
                      className="flex-1 py-4 text-[13px] font-semibold text-[#C5A059] hover:text-[#A68233] active:bg-white/[0.03] transition-all cursor-pointer"
                    >
                      Instalar
                    </button>
                  </>
                )}
              </div>
              <div className="sm:hidden flex justify-center pb-3 pt-1">
                <div className="w-10 h-1 rounded-full bg-white/10" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowResetConfirm(false);
                setResetText('');
              }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative z-10 w-full sm:max-w-[340px] bg-[#1C1C1E] sm:rounded-2xl rounded-t-2xl overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4">
                <p className="text-[15px] font-semibold text-white">Limpar dados</p>
                <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                  Todos os dados da barbearia vão ser apagados permanentemente.
                </p>
              </div>
              <div className="px-6 pb-5">
                <input
                  type="text"
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value.toUpperCase())}
                  placeholder="Digite LIMPAR para confirmar"
                  aria-label="Digite LIMPAR para confirmar a limpeza dos dados"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/10 transition-all placeholder:text-zinc-600"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && resetText === 'LIMPAR') handleResetData();
                  }}
                />
              </div>
              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetText('');
                  }}
                  className="flex-1 py-4 text-[13px] font-medium text-zinc-400 hover:text-white active:bg-white/[0.03] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  onClick={handleResetData}
                  disabled={resetText !== 'LIMPAR' || resetting}
                  className="flex-1 py-4 text-[13px] font-semibold text-red-500 hover:text-red-400 active:bg-white/[0.03] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  {resetting ? '...' : 'Limpar'}
                </button>
              </div>
              <div className="sm:hidden flex justify-center pb-3 pt-1">
                <div className="w-10 h-1 rounded-full bg-white/10" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminProfile;
