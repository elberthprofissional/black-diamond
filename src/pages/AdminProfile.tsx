import React, { useState, useEffect } from 'react';
import { getBookings, getServices, getClients } from '../lib/api';
import type { Booking, Service, Client } from '../types';
import { Download, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../components/Admin/AdminLayout';
import { useAdminLogout } from '../hooks/useAdminLogout';

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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled] = useState(() => 
    window.matchMedia('(display-mode: standalone)').matches || 
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );

  const handleLogout = useAdminLogout();

  useEffect(() => {
    if (isInstalled) return;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

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

  bookings.forEach(b => {
    const date = new Date(b.booking_date);
    if (b.status !== 'cancelled') lucroTotal += Number(b.total_price);
    if (date >= startOfMonth) {
      if (b.status === 'cancelled') canceladosMes++;
      else {
        lucroMes += Number(b.total_price);
        concluidosMes++;
        b.service_ids?.forEach(id => { serviceCountsMes[id] = (serviceCountsMes[id] || 0) + 1; });
      }
    }
    if (date >= startOfWeek) {
      if (b.status === 'cancelled') canceladosSemana++;
      else {
        lucroSemana += Number(b.total_price);
        concluidosSemana++;
        b.service_ids?.forEach(id => { serviceCountsSemana[id] = (serviceCountsSemana[id] || 0) + 1; });
      }
    }
  });

  const currentConcluidos = timeRange === 'week' ? concluidosSemana : concluidosMes;
  const currentCancelados = timeRange === 'week' ? canceladosSemana : canceladosMes;
  
  const currentServiceCounts = timeRange === 'week' ? serviceCountsSemana : serviceCountsMes;
  const topServices = services
    .map(srv => ({
      name: srv.name,
      count: currentServiceCounts[srv.id] || 0
    }))
    .sort((a, b) => b.count - a.count);

  const clientesNovosMes = clients.filter(c => new Date(c.created_at) >= startOfMonth).length;
  const clientesNovosSemana = clients.filter(c => new Date(c.created_at) >= startOfWeek).length;
  const currentNovos = timeRange === 'week' ? clientesNovosSemana : clientesNovosMes;

  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center font-sans">
      <div className="w-4 h-4 border-2 border-white/5 border-t-[#C5A059] rounded-full animate-spin" />
    </div>
  );

  return (
    <AdminLayout 
      wrapperClassName="min-h-screen bg-[#0A0A0A] text-white font-sans flex overflow-hidden selection:bg-[#C5A059]/30 relative"
      innerClassName="flex-1 lg:ml-[320px] flex flex-col min-h-screen overflow-y-auto scrollbar-hide bg-[#0A0A0A] z-10"
      mainClassName="flex-1 w-full px-5 sm:px-8 lg:px-12 pt-24 lg:pt-8 pb-28 space-y-5 text-left"
    >
          
          {/* 1. HEADER - Perfil */}
          <div className="flex items-center gap-4 py-2">
            <div className="relative shrink-0">
              <img 
                src="/assets/barbeiro.webp"
                alt="Tato" 
                className="w-14 h-14 lg:w-16 lg:h-16 rounded-full object-cover" 
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0A0A0A] rounded-full" />
            </div>
            <div className="flex-1">
              <h1 className="text-base lg:text-lg font-bold text-white tracking-tight">{greeting}, Tato</h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">Barbeiro Administrador</p>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 rounded-lg uppercase tracking-wider transition-all cursor-pointer shrink-0"
            >
              Sair
            </button>
          </div>

          {/* 1.5 INSTALAR APP (mobile only) */}
          <button
            onClick={() => setShowInstallPrompt(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[10px] font-bold text-zinc-400 hover:text-[#C5A059] hover:border-[#C5A059]/20 transition-all cursor-pointer lg:hidden"
          >
            <Download size={13} />
            {isInstalled ? 'App Instalado' : 'Instalar Aplicativo'}
          </button>

          {/* 2. FATURAMENTO TOTAL */}
          <div className="lg:bg-[#111111] lg:border lg:border-white/5 lg:rounded-2xl lg:p-5">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">Faturamento Total</span>
            <p className="text-3xl font-black text-white tracking-tight">
              <span className="text-sm font-bold text-[#C5A059] mr-1">R$</span>
              {lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>

          {/* 2. SWITCHER */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Análise da Barbearia</span>
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

          {/* 3. MÉTRICAS - 4 colunas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#111111] border border-white/5 rounded-xl p-4">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">
                {timeRange === 'week' ? 'Faturamento Semanal' : 'Faturamento Mensal'}
              </span>
              <p className="text-xl font-black text-[#C5A059] tracking-tight tabular-nums">
                R$ {(timeRange === 'week' ? lucroSemana : lucroMes).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-[#111111] border border-white/5 rounded-xl p-4">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Atendimentos</span>
              <p className="text-xl font-black text-white tracking-tight tabular-nums">{currentConcluidos}</p>
            </div>
            <div className="bg-[#111111] border border-white/5 rounded-xl p-4">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Novos Clientes</span>
              <p className="text-xl font-black text-white tracking-tight tabular-nums">{currentNovos}</p>
            </div>
            <div className="bg-[#111111] border border-white/5 rounded-xl p-4">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] block mb-1">Cancelados</span>
              <p className="text-xl font-black text-red-500/60 tracking-tight tabular-nums">{currentCancelados}</p>
            </div>
          </div>

          {/* 4. Análise de Serviços */}
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
            <h2 className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Análise de Serviços</h2>
            {topServices.length > 0 && topServices.some(s => s.count > 0) ? (
              <div className="space-y-3">
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

      {/* LOGOUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative z-10 w-full sm:w-[260px] bg-[#1A1A1A] sm:rounded-2xl rounded-t-2xl overflow-hidden"
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
              className="relative z-10 w-full max-w-[280px] bg-[#1A1A1A] rounded-2xl overflow-hidden"
            >
              {isInstalled ? (
                <>
                  <div className="p-5 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                      <Check size={16} className="text-emerald-500" />
                    </div>
                    <p className="text-[11px] text-zinc-300 font-medium">App já instalado</p>
                    <p className="text-[9px] text-zinc-600 mt-1">Acesse pela tela inicial</p>
                  </div>
                  <div className="border-t border-white/[0.06]">
                    <button 
                      onClick={() => setShowInstallPrompt(false)}
                      className="w-full py-3.5 text-[11px] font-bold text-zinc-300 active:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </>
              ) : deferredPrompt ? (
                <>
                  <div className="p-5 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto mb-3">
                      <Download size={16} className="text-[#C5A059]" />
                    </div>
                    <p className="text-[11px] text-zinc-300 font-medium">Instalar aplicativo?</p>
                    <p className="text-[9px] text-zinc-600 mt-1">Acesso rápido na tela inicial</p>
                  </div>
                  <div className="border-t border-white/[0.06]">
                    <button 
                      onClick={handleInstall}
                      className="w-full py-3.5 text-[11px] font-bold text-[#C5A059] active:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      Instalar
                    </button>
                  </div>
                  <div className="border-t border-white/[0.06]">
                    <button 
                      onClick={() => setShowInstallPrompt(false)}
                      className="w-full py-3.5 text-[11px] font-bold text-zinc-400 active:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      Agora não
                    </button>
                  </div>
                </>
              ) : (
                <>
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
      
    </AdminLayout>
  );
};

export default AdminProfile;
