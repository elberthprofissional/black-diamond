import React, { useState, useEffect } from 'react';
import { getBookings, getServices, getClients, deleteAllClients } from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import type { Booking, Service, Client } from '../types';
import { Download, LogOut, Bell, Scissors, DollarSign, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../components/Admin/AdminLayout';
import { useAdminLogout } from '../hooks/useAdminLogout';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import { useToast } from '../hooks/useToast';
import { usePushNotifications } from '../hooks/usePushNotifications';
import ProfileMobile from '../components/Admin/shared/ProfileMobile';


const AdminProfile: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [showBalance, setShowBalance] = useState(() => localStorage.getItem('barber_show_balance') !== 'false');
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

  const loadData = async () => {
    try {
      const [bookingsData, servicesData, clientsData] = await Promise.all([
        getBookings(),
        getServices(),
        getClients()
      ]);
      setBookings(bookingsData || []);
      setServices(servicesData || []);
      setClients(clientsData || []);
    } catch { /* ignored */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const toggleBalance = () => {
    setShowBalance(prev => {
      localStorage.setItem('barber_show_balance', String(!prev));
      return !prev;
    });
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(now.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  let lucroTotal = 0;
  let lucroMes = 0;
  let canceladosMes = 0;
  let concluidosMes = 0;
  const serviceCountsMes: Record<string, number> = {};
  let lucroSemana = 0;
  let canceladosSemana = 0;
  let concluidosSemana = 0;
  const serviceCountsSemana: Record<string, number> = {};

  (bookings || []).forEach(b => {
    if (!b || !b.booking_date) return;
    const parts = b.booking_date.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(date.getTime())) return;

    const price = Number(b.total_price || 0);

    if (b.status !== 'cancelled') lucroTotal += price;
    if (date >= startOfMonth) {
      if (b.status === 'cancelled') canceladosMes++;
      else {
        lucroMes += price;
        concluidosMes++;
        if (Array.isArray(b.service_ids)) {
          b.service_ids.forEach(id => {
            if (id) serviceCountsMes[id] = (serviceCountsMes[id] || 0) + 1;
          });
        }
      }
    }
    if (date >= startOfWeek) {
      if (b.status === 'cancelled') canceladosSemana++;
      else {
        lucroSemana += price;
        concluidosSemana++;
        if (Array.isArray(b.service_ids)) {
          b.service_ids.forEach(id => {
            if (id) serviceCountsSemana[id] = (serviceCountsSemana[id] || 0) + 1;
          });
        }
      }
    }
  });

  const currentConcluidos = timeRange === 'week' ? concluidosSemana : concluidosMes;
  const currentCancelados = timeRange === 'week' ? canceladosSemana : canceladosMes;
  
  const currentServiceCounts = timeRange === 'week' ? serviceCountsSemana : serviceCountsMes;
  const topServices = (services || [])
    .filter(srv => srv && srv.id && srv.name)
    .map(srv => ({
      name: srv.name,
      count: currentServiceCounts[srv.id] || 0
    }))
    .sort((a, b) => b.count - a.count);

  const clientesNovosMes = (clients || []).filter(c => {
    if (!c || !c.created_at) return false;
    if (c.name === 'BLOQUEADO' || c.name === 'CLIENTE EXCLUIDO' || c.phone === '00000000000') return false;
    const d = new Date(c.created_at);
    return !isNaN(d.getTime()) && d >= startOfMonth;
  }).length;

  const clientesNovosSemana = (clients || []).filter(c => {
    if (!c || !c.created_at) return false;
    if (c.name === 'BLOQUEADO' || c.name === 'CLIENTE EXCLUIDO' || c.phone === '00000000000') return false;
    const d = new Date(c.created_at);
    return !isNaN(d.getTime()) && d >= startOfWeek;
  }).length;
  const currentNovos = timeRange === 'week' ? clientesNovosSemana : clientesNovosMes;



  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  if (loading) return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center font-sans">
      <div className="w-5 h-5 border-2 border-white/5 border-t-[#C5A059] rounded-full animate-spin" />
    </div>
  );

  const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

  const handleInstallClick = () => {
    if (isStandalone) {
      showSuccess('Aplicativo já instalado!');
      return;
    }
    setShowInstallPrompt(true);
  };

  const handleConfirmInstall = async () => {
    if (isIOS) {
      // iOS: just close the modal, guide is shown
      setShowInstallPrompt(false);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showSuccess('Aplicativo instalado!');
      }
      setDeferredPrompt(null);
    }
    setShowInstallPrompt(false);
  };

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe()
      showSuccess('Notificações desativadas')
    } else {
      if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
        showError('Chave VAPID não configurada no servidor')
        return
      }
      if (!('Notification' in window)) {
        showError('Seu navegador não suporta notificações')
        return
      }
      if (Notification.permission === 'denied') {
        showError('Notificações bloqueadas. Permita nas configurações do navegador')
        return
      }
      const success = await subscribe()
      if (success) {
        showSuccess('Notificações ativadas!')
      } else {
        showError('Erro ao ativar notificações')
      }
    }
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
      // deleteAllClients deletes all bookings first, then soft-deletes clients
      await deleteAllClients();
      showSuccess('Dados limpos com sucesso!');
      setShowResetConfirm(false);
      setResetText('');
      await loadData();
    } catch (error) {
      console.error('Reset error:', error);
      showError(getErrorMessage(error));
    } finally {
      setResetting(false);
    }
  };

  return (
    <AdminLayout 
      mainClassName="flex-1 w-full overflow-x-hidden px-0 sm:px-8 lg:px-12 pt-20 lg:pt-8 pb-24 lg:pb-12 space-y-6 text-left max-w-7xl mx-auto font-sans"
    >
      
      {/* ========================================================================= */}
      {/* 1. DESKTOP LAYOUT (Original layout restored) */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 py-2 border-b border-white/5 pb-5">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full border border-white/10 overflow-hidden">
              <img src="/assets/tato.webp" alt="Tato" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0A0A0A] rounded-full" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white tracking-tight">{greeting}, Tato</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleNotifications}
              className={`px-3 py-1.5 text-[9px] font-bold border rounded-lg uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                isSubscribed
                  ? 'text-[#C5A059] border-[#C5A059]/30 bg-[#C5A059]/5'
                  : 'text-zinc-500 border-white/[0.06] hover:text-white hover:border-white/[0.12]'
              }`}
            >
              {isSubscribed ? 'Notificando' : 'Notificar'}
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 rounded-lg uppercase tracking-wider transition-all cursor-pointer shrink-0"
            >
              Limpar
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 rounded-lg uppercase tracking-wider transition-all cursor-pointer shrink-0"
            >
              Sair
            </button>
          </div>
        </div>


        {/* Faturamento Total */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">Faturamento Total</span>
          <p className="text-3xl font-black text-white tracking-tight">
            <span className="text-sm font-bold text-[#C5A059] mr-1">R$</span>
            {lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Dashboard grid metrics - Semana + Mês */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <Scissors size={22} className="text-[#C5A059]/30" />
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Atendimentos</span>
              <p className="text-xl font-black text-white tracking-tight tabular-nums">{currentConcluidos}</p>
            </div>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <span className="text-[#C5A059]/30 text-lg font-black">✕</span>
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Cancelados</span>
              <p className="text-xl font-black text-red-500/70 tracking-tight tabular-nums">{currentCancelados}</p>
            </div>
          </div>
          <div className="col-span-2 lg:col-span-2 bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <DollarSign size={22} className="text-[#C5A059]/30" />
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Faturamento Semanal</span>
              <p className="text-xl font-black text-[#C5A059] tracking-tight tabular-nums">
                R$ {lucroSemana.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="col-span-2 lg:col-span-2 bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <DollarSign size={22} className="text-[#C5A059]/30" />
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Faturamento Mensal</span>
              <p className="text-xl font-black text-[#C5A059] tracking-tight tabular-nums">
                R$ {lucroMes.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>



        {/* Services analytics */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
          <h2 className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Serviços mais vendidos no mês</h2>
          {topServices.length > 0 && topServices.some(s => s.count > 0) ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {topServices.filter(s => s.count > 0).map((srv, idx) => {
                const maxCount = Math.max(...topServices.map(s => s.count));
                const percentage = maxCount > 0 ? (srv.count / maxCount) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-300">{srv.name}</span>
                      <span className="text-[10px] font-black text-[#C5A059] tabular-nums">{srv.count}x</span>
                    </div>
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#C5A059] rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest text-center py-6">Nenhum serviço no período</p>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE LAYOUT */}
      {/* ========================================================================= */}
      <ProfileMobile
        greeting={greeting}
        showBalance={showBalance}
        toggleBalance={toggleBalance}
        lucroTotal={lucroTotal}
        lucroSemana={lucroSemana}
        lucroMes={lucroMes}
        currentConcluidos={currentConcluidos}
        currentNovos={currentNovos}
        currentCancelados={currentCancelados}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        topServices={topServices}
        quickActions={quickActions}
      />

      {/* LOGOUT CONFIRMATION MODAL */}
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

      {/* INSTALL APP PROMPT */}
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
              {isIOS ? (
                // iOS: step-by-step guide
                <>
                  <div className="px-6 pt-6 pb-4">
                    <p className="text-[15px] font-semibold text-white">Instalar na tela de início</p>
                    <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                      No iPhone, abra este site no <strong className="text-white">Safari</strong> e siga os passos:
                    </p>
                  </div>
                  <div className="px-6 pb-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C5A059]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-[#C5A059]">1</span>
                      </div>
                      <p className="text-[12px] text-zinc-400 leading-relaxed">Toque no ícone de <strong className="text-zinc-300">Compartilhar</strong> (quadrado com seta pra cima)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C5A059]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-[#C5A059]">2</span>
                      </div>
                      <p className="text-[12px] text-zinc-400 leading-relaxed">Role pra baixo e toque em <strong className="text-zinc-300">"Adicionar à Tela de Início"</strong></p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C5A059]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-[#C5A059]">3</span>
                      </div>
                      <p className="text-[12px] text-zinc-400 leading-relaxed">Toque em <strong className="text-zinc-300">Adicionar</strong> no canto superior direito</p>
                    </div>
                  </div>
                  <div className="px-6 pb-5">
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      Depois de instalado, as notificações ficam disponíveis no iOS 16.4+.
                    </p>
                  </div>
                </>
              ) : (
                // Android / Desktop: native install
                <>
                  <div className="px-6 pt-6 pb-4">
                    <p className="text-[15px] font-semibold text-white">Instalar aplicativo</p>
                    <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                      Adicione o Black Diamond à sua tela de início para acesso rápido.
                    </p>
                  </div>
                </>
              )}

              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => setShowInstallPrompt(false)}
                  className="flex-1 py-4 text-[13px] font-medium text-zinc-400 hover:text-white active:bg-white/[0.03] transition-all cursor-pointer"
                >
                  {isIOS ? 'Entendi' : 'Cancelar'}
                </button>
                {!isIOS && (
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

              {/* Mobile drag indicator */}
              <div className="sm:hidden flex justify-center pb-3 pt-1">
                <div className="w-10 h-1 rounded-full bg-white/10" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESET DATA CONFIRM MODAL */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowResetConfirm(false); setResetText(''); }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative z-10 w-full sm:max-w-[340px] bg-[#1C1C1E] sm:rounded-2xl rounded-t-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <p className="text-[15px] font-semibold text-white">Limpar dados</p>
                <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                  Todos os dados da barbearia vão ser apagados permanentemente.
                </p>
              </div>

              {/* Input */}
              <div className="px-6 pb-5">
                <input
                  type="text"
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value.toUpperCase())}
                  placeholder="Digite LIMPAR para confirmar"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/10 transition-all placeholder:text-zinc-600"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && resetText === 'LIMPAR') handleResetData(); }}
                />
              </div>

              {/* Buttons */}
              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => { setShowResetConfirm(false); setResetText(''); }}
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

              {/* Mobile drag indicator */}
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
