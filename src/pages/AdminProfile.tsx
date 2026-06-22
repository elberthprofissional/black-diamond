import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, getServices, getClients } from '../lib/api';
import type { Booking, Service, Client } from '../types';
import { 
  Download, 
  Eye, 
  EyeOff, 
  Clock, 
  Calendar, 
  Users, 
  LogOut, 
  TrendingUp,
  Sparkles,
  Scissors,
  DollarSign,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../components/Admin/AdminLayout';
import { useAdminLogout } from '../hooks/useAdminLogout';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import { useToast } from '../hooks/useToast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const AdminProfile: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [showBalance, setShowBalance] = useState(() => localStorage.getItem('barber_show_balance') !== 'false');

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => 
    window.matchMedia('(display-mode: standalone)').matches || 
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );

  const navigate = useNavigate();
  const handleLogout = useAdminLogout();
  const { toast, showSuccess, showError } = useToast();

  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  useEffect(() => {
    if (isInstalled) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isInstalled]);

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
      } catch (err) {
        console.error(err);
      } finally {
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
  startOfWeek.setDate(now.getDate() - now.getDay());
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
    const date = new Date(b.booking_date);
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
    if (c.name === 'BLOQUEADO' || c.phone === '00000000000') return false;
    const date = new Date(c.created_at);
    return !isNaN(date.getTime()) && date >= startOfMonth;
  }).length;

  const clientesNovosSemana = (clients || []).filter(c => {
    if (!c || !c.created_at) return false;
    if (c.name === 'BLOQUEADO' || c.phone === '00000000000') return false;
    const date = new Date(c.created_at);
    return !isNaN(date.getTime()) && date >= startOfWeek;
  }).length;
  const currentNovos = timeRange === 'week' ? clientesNovosSemana : clientesNovosMes;



  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  if (loading) return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center font-sans">
      <div className="w-5 h-5 border-2 border-white/5 border-t-[#C5A059] rounded-full animate-spin" />
    </div>
  );

  const handleInstallClick = () => {
    if (isInstalled) {
      showSuccess('Aplicativo já instalado!');
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') {
          setIsInstalled(true);
          showSuccess('Aplicativo instalado com sucesso!');
        }
        setDeferredPrompt(null);
      });
      return;
    }
    setShowInstallPrompt(true);
  };

  const quickActions = [
    { label: 'Hoje', icon: Clock, onClick: () => navigate('/admin') },
    { label: 'Semana', icon: Calendar, onClick: () => navigate('/admin/weekly') },
    { label: 'Clientes', icon: Users, onClick: () => navigate('/admin/clients') },
    { label: 'Aplicativo', icon: Download, onClick: handleInstallClick },
    { label: 'Sair', icon: LogOut, onClick: () => setShowLogoutConfirm(true) },
  ];

  return (
    <AdminLayout 
      mainClassName="flex-1 w-full px-5 sm:px-8 lg:px-12 pt-20 lg:pt-8 pb-24 lg:pb-12 space-y-6 text-left max-w-7xl mx-auto font-sans"
    >
      
      {/* ========================================================================= */}
      {/* 1. DESKTOP LAYOUT (Original layout restored) */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 py-2 border-b border-white/5 pb-5">
          <div className="relative shrink-0">
            <img 
              src="/assets/barbeiro.webp"
              alt="Tato" 
              className="w-16 h-16 rounded-full object-cover" 
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0A0A0A] rounded-full" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white tracking-tight">{greeting}, Tato</h1>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">Barbeiro Administrador</p>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 rounded-lg uppercase tracking-wider transition-all cursor-pointer shrink-0"
          >
            Sair
          </button>
        </div>


        <p className="text-[11px] text-zinc-500">Aqui está o resumo da sua barbearia hoje.</p>

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
      {/* 2. MOBILE LAYOUT (Nubank style layout, but customized with Site Dark & Gold Colors) */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex flex-col gap-6 max-w-md mx-auto">
        
        {/* NUBANK STYLE HEADER - BLACK & GOLD */}
        <div className="bg-[#161616] border border-white/5 px-6 pt-6 pb-8 rounded-b-[24px] text-white flex flex-col gap-6 relative overflow-hidden shadow-lg shadow-black/40">
          
          {/* Subtle gold decoration bubble background */}
          <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-[#C5A059]/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/[0.08] bg-white/[0.03] shrink-0">
              <img 
                src="/assets/barbeiro.webp"
                alt="Tato" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleBalance} 
                className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-all cursor-pointer text-zinc-400 hover:text-white"
                aria-label={showBalance ? "Ocultar faturamento" : "Exibir faturamento"}
              >
                {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-white">{greeting}, Tato</h1>
            <p className="text-[9px] text-[#C5A059] uppercase tracking-widest font-bold">Barbeiro Administrador</p>
          </div>
        </div>

        {/* CONTA SECTION */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Faturamento Total</p>
            <div className="text-2xl font-bold text-white tracking-tight leading-none flex items-baseline">
              {showBalance ? (
                <>
                  <span className="text-[#C5A059] font-bold text-sm mr-1">R$</span>
                  <span>{lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </>
              ) : (
                <span className="text-zinc-600 tracking-widest text-lg font-bold">••••</span>
              )}
            </div>
          </div>
        </div>

        {/* NUBANK STYLE HORIZONTAL ACTIONS ROW */}
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Ações Rápidas</span>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide snap-x">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button 
                  key={idx} 
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 snap-center cursor-pointer shrink-0 group select-none"
                >
                  <div className="w-14 h-14 rounded-full bg-[#111111] hover:bg-[#161616] border border-white/5 group-hover:border-[#C5A059]/30 flex items-center justify-center text-zinc-400 group-hover:text-white transition-all">
                    <Icon size={18} className="transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 group-hover:text-zinc-300 uppercase tracking-widest transition-colors">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SWITCHER FOR TIMEFRAME */}
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 pt-2">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Resumo do Período</span>
          <div className="flex gap-4">
            <button 
              onClick={() => setTimeRange('week')}
              className={`relative pb-2 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${timeRange === 'week' ? 'text-[#C5A059]' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {timeRange === 'week' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C5A059] rounded-full" />}
              Semana
            </button>
            <button 
              onClick={() => setTimeRange('month')}
              className={`relative pb-2 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${timeRange === 'month' ? 'text-[#C5A059]' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {timeRange === 'month' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C5A059] rounded-full" />}
              Mês
            </button>
          </div>
        </div>

        {/* NUBANK STYLE FEATURES CARDS */}
        <div className="space-y-4">
          {/* Card 1: Resumo Financeiro */}
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <TrendingUp size={14} className="text-[#C5A059]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Análise da Barbearia</span>
            </div>

            <div className="grid grid-cols-2 gap-4 divide-x divide-white/[0.04]">
              <div className="space-y-1">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Faturamento</span>
                <div className="text-base font-bold text-[#C5A059] tabular-nums">
                  {showBalance ? (
                    `R$ ${(timeRange === 'week' ? lucroSemana : lucroMes).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  ) : (
                    '••••'
                  )}
                </div>
              </div>
              <div className="space-y-1 pl-4">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Atendimentos</span>
                <div className="text-base font-bold text-white tabular-nums">{currentConcluidos}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 divide-x divide-white/[0.04] pt-2 border-t border-white/[0.03]">
              <div className="space-y-1">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Novos Clientes</span>
                <div className="text-base font-bold text-white tabular-nums">{currentNovos}</div>
              </div>
              <div className="space-y-1 pl-4">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Cancelamentos</span>
                <div className="text-base font-bold text-red-500/70 tabular-nums">{currentCancelados}</div>
              </div>
            </div>
          </div>

          {/* Card 2: Análise de Serviços */}
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Sparkles size={14} className="text-[#C5A059]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Serviços Mais Vendidos</span>
            </div>

            {topServices.length > 0 && topServices.some(s => s.count > 0) ? (
              <div className="space-y-3 pt-1">
                {topServices.filter(s => s.count > 0).map((srv, idx) => {
                  const maxCount = Math.max(...topServices.map(s => s.count));
                  const percentage = maxCount > 0 ? (srv.count / maxCount) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-zinc-300">{srv.name}</span>
                        <span className="font-bold text-[#C5A059] tabular-nums">{srv.count}x</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
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
      </div>

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
              <div className="p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto mb-3">
                  <Download size={16} className="text-[#C5A059]" />
                </div>
                <p className="text-[11px] text-zinc-300 font-medium">Instalar aplicativo</p>
                <p className="text-[9px] text-zinc-600 mt-1 max-w-[220px] mx-auto leading-relaxed">Toque em <strong className="text-white">Compartilhar</strong> e depois <strong className="text-white">"Adicionar à Tela de Início"</strong></p>
              </div>
              <div className="border-t border-white/[0.06]">
                <button 
                  onClick={() => setShowInstallPrompt(false)}
                  className="w-full py-3.5 text-[11px] font-bold text-zinc-300 active:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  Entendido
                    </button>
                  </div>
                </>
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
