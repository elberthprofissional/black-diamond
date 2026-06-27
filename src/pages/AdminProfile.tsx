import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, getServices, getClients } from '../lib/api';
import type { Booking, Service, Client } from '../types';
import { 
  Download, 
  Clock, 
  Calendar, 
  Users, 
  LogOut, 
  Bell,
  Scissors,
  DollarSign,
  UserPlus
} from 'lucide-react';
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
  const [installState, setInstallState] = useState<'prompt' | 'installing' | 'success'>('prompt');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    window.deferredPrompt || null
  );
  const navigate = useNavigate();
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

  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, []);

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

  const handleInstallClick = () => {
    const isAlreadyInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                               (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isAlreadyInstalled) {
      showSuccess('Aplicativo já instalado!');
      return;
    }
    setInstallState('prompt');
    setShowInstallPrompt(true);
  };

  const startMockInstallation = () => {
    setInstallState('installing');
    setTimeout(() => {
      setInstallState('success');
      setTimeout(() => {
        localStorage.setItem('barber_pwa_installed', 'true');
        setShowInstallPrompt(false);
        showSuccess('Aplicativo adicionado com sucesso!');
        setInstallState('prompt');
      }, 1200);
    }, 1500);
  };

  const handleConfirmInstall = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    if (!isIOS && deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') {
          startMockInstallation();
        } else {
          setShowInstallPrompt(false);
        }
        setDeferredPrompt(null);
      });
    } else {
      startMockInstallation();
    }
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
    { label: 'Hoje', icon: Clock, onClick: () => navigate('/admin') },
    { label: 'Semana', icon: Calendar, onClick: () => navigate('/admin/weekly') },
    { label: 'Clientes', icon: Users, onClick: () => navigate('/admin/clients') },
    { label: 'Notificar', icon: Bell, onClick: handleToggleNotifications, active: isSubscribed },
    { label: 'Aplicativo', icon: Download, onClick: handleInstallClick },
    { label: 'Sair', icon: LogOut, onClick: () => setShowLogoutConfirm(true) },
  ];

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
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 rounded-lg uppercase tracking-wider transition-all cursor-pointer shrink-0"
          >
            Sair
          </button>
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
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-1 bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <Scissors size={22} className="text-[#C5A059]/30" />
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Atendimentos</span>
              <p className="text-xl font-black text-white tracking-tight tabular-nums">{currentConcluidos}</p>
            </div>
          </div>
          <div className="col-span-2 bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <DollarSign size={22} className="text-[#C5A059]/30" />
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Faturamento Semanal</span>
              <p className="text-xl font-black text-[#C5A059] tracking-tight tabular-nums">
                R$ {lucroSemana.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="col-span-2 bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <DollarSign size={22} className="text-[#C5A059]/30" />
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Faturamento Mensal</span>
              <p className="text-xl font-black text-[#C5A059] tracking-tight tabular-nums">
                R$ {lucroMes.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="col-span-1 bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <UserPlus size={22} className="text-[#C5A059]/30" />
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Clientes</span>
              <p className="text-xl font-black text-white tracking-tight tabular-nums">{currentNovos}</p>
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

      {/* INSTALL APP PROMPT - iOS Safari fallback */}
      <AnimatePresence>
        {showInstallPrompt && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallPrompt(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-[280px] bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden"
            >
              {installState === 'prompt' && (
                <>
                  <div className="p-5 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto mb-3">
                      <Download size={16} className="text-[#C5A059]" />
                    </div>
                    <p className="text-[11px] text-zinc-300 font-medium">Instalar aplicativo?</p>
                    <p className="text-[9px] text-zinc-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                      Deseja adicionar o Black Diamond à sua tela de início para acesso rápido?
                    </p>
                  </div>
                  <div className="flex border-t border-white/[0.06] divide-x divide-white/[0.06]">
                    <button 
                      onClick={() => setShowInstallPrompt(false)}
                      className="flex-1 py-3.5 text-[11px] font-bold text-zinc-400 active:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      Não
                    </button>
                    <button 
                      onClick={handleConfirmInstall}
                      className="flex-1 py-3.5 text-[11px] font-bold text-[#C5A059] active:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      Sim
                    </button>
                  </div>
                </>
              )}

              {installState === 'installing' && (
                <div className="p-6 text-center flex flex-col items-center">
                  <div className="w-10 h-10 border-2 border-[#C5A059]/20 border-t-[#C5A059] rounded-full animate-spin mb-4" />
                  <p className="text-[11px] text-zinc-300 font-bold uppercase tracking-wider">Adicionando...</p>
                  <p className="text-[9px] text-zinc-500 mt-1">Configurando na tela de início...</p>
                </div>
              )}

              {installState === 'success' && (
                <div className="p-6 text-center flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059] mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="text-[11px] text-[#C5A059] font-bold uppercase tracking-wider">Pronto!</p>
                  <p className="text-[9px] text-zinc-500 mt-1">Instalado com sucesso.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminProfile;
