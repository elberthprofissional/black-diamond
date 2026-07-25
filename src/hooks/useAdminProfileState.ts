import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { deleteAllClients } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../lib/utils';
import { useAdminLogout } from './useAdminLogout';
import { useToast } from './useToast';
import { usePushNotifications } from './usePushNotifications';
import { useBarberSettings } from './useBarberSettings';
import { useProfileStats } from './useProfileStats';
import { usePwaInstall } from './usePwaInstall';
import { logError } from '../lib/logger';

export function useAdminProfileState() {
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

  // Back navigation handling
  useEffect(() => {
    if (settingsSection && settingsSection !== '__back' && !enteredSection.current) {
      window.history.pushState({ section: settingsSection }, '');
      enteredSection.current = true;
    }
    if (!settingsSection) {
      enteredSection.current = false;
    }
  }, [settingsSection]);

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

  // quickActions is created in AdminProfile.tsx (needs Lucide icons in component scope)

  const handleResetData = async () => {
    if (resetStep === 'confirm') {
      setResetStep('password');
      return;
    }
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

  return {
    showSettings,
    stats,
    loading,
    timeRange,
    setTimeRange,
    showBalance,
    setShowBalance,
    showLogoutConfirm,
    setShowLogoutConfirm,
    toast,
    showSuccess,
    showError,
    isIOS,
    isAndroid,
    isSamsung,
    isStandalone,
    showInstallPrompt,
    deferredPrompt,
    setShowInstallPrompt,
    handleInstallClick,
    handleConfirmInstall,
    showResetConfirm,
    setShowResetConfirm,
    resetText,
    setResetText,
    resetStep,
    setResetStep,
    resetPassword,
    setResetPassword,
    resetPasswordError,
    setResetPasswordError,
    resetting,
    handleLogout,
    isSubscribed,
    barberName,
    barberPhoto,
    settingsSection,
    setSettingsSection,
    showHelp,
    setShowHelp,
    navigate,
    greeting,
    currentConcluidos,
    currentCancelados,
    handleToggleNotifications,
    handleResetData,
    loadData,
  };
}
