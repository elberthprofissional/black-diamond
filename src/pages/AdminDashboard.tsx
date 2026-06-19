import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, createBooking, updateBookingStatus, getServices, deleteBooking } from '../lib/api';
import { TIME_SLOTS, getLocalDateString } from '../lib/utils';
import AdminNavbar from '../components/Admin/Navbar';
import AdminSidebar from '../components/Admin/AdminSidebar';
import BottomTabs from '../components/Admin/BottomTabs';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate] = useState(getLocalDateString());
  const [completingBooking, setCompletingBooking] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [unblockingBooking, setUnblockingBooking] = useState<any>(null);
  const [filter, setFilter] = useState<'occupied' | 'free' | 'blocked'>('occupied');
  const [blockingSlot, setBlockingSlot] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showNextDetails, setShowNextDetails] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesData = await getServices();
        setServices(servicesData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchServices();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getBookings(selectedDate);
      setBookings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleComplete = async () => {
    if (!completingBooking) return;
    try {
      await updateBookingStatus(completingBooking.id, 'completed');
      setCompletingBooking(null);
      loadData();
      setToast({ message: 'Atendimento concluído!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Erro ao finalizar agendamento.', type: 'error' });
    }
  };

  const handleBlockSlot = async (slot: string) => {
    setBlockingSlot(slot);
    try {
      await createBooking(
        {
          service_ids: [],
          booking_date: selectedDate,
          booking_time: slot,
          total_price: 0,
          total_duration: 0
        },
        {
          name: 'BLOQUEADO',
          phone: '00000000000'
        }
      );
      await loadData();
      setToast({ message: `Horário ${slot} bloqueado com sucesso!`, type: 'success' });
    } catch (error) {
      console.error(error);
      setToast({ message: 'Erro ao bloquear horário.', type: 'error' });
    } finally {
      setBlockingSlot(null);
    }
  };

  const confirmUnblock = async () => {
    if (!unblockingBooking) return;
    try {
      await updateBookingStatus(unblockingBooking.id, 'cancelled');
      setUnblockingBooking(null);
      await loadData();
      setToast({ message: 'Horário liberado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Erro ao desbloquear horário.', type: 'error' });
    }
  };

  const sendWhatsAppReminder = (booking: any) => {
    if (!booking.clients?.phone) return;
    let phone = booking.clients.phone.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) {
      phone = '55' + phone;
    }
    const name = booking.clients.name.split(' ')[0];
    const time = booking.booking_time.slice(0, 5);
    const text = `Fala, ${name}! Beleza? Passando para lembrar do seu horário de hoje às ${time} no Black Diamond. Confirmado? 💈`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const dailyRevenue = bookings
    .filter(b => b.status === 'completed' || b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);


  const occupiedBookings = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled' && b.clients?.name !== 'BLOQUEADO');
  const blockedBookings = bookings.filter(b => b.status !== 'cancelled' && b.clients?.name === 'BLOQUEADO');
  
  const isTimeOccupied = (time: string) => {
    return bookings.some(b => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === time);
  };
  const freeSlots = TIME_SLOTS.filter(slot => !isTimeOccupied(slot));

  const getNextBooking = () => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const upcoming = bookings
      .filter(b => b.status !== 'cancelled' && b.booking_time >= currentTime && b.clients?.name !== 'BLOQUEADO')
      .sort((a, b) => a.booking_time.localeCompare(b.booking_time));
    
    return upcoming[0] || null;
  };

  const nextBooking = getNextBooking();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex overflow-hidden selection:bg-[#C5A059]/30">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-[320px] flex flex-col min-h-screen overflow-y-auto scrollbar-hide bg-[#0A0A0A]">
        <AdminNavbar />

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 lg:pt-8 pb-28">
          
          {/* 1. TOP BAR */}
          <div className="flex items-center justify-between gap-4 pb-4 sm:pb-6 mb-4 sm:mb-6 border-b border-white/5">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white leading-tight uppercase italic">Agenda do Dia</h1>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:block">
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </span>
          </div>

          {/* 2. STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 sm:mb-6">
            {/* Próximo Cliente - Expandable */}
            <div className="md:col-span-1">
              <button
                onClick={() => nextBooking && setShowNextDetails(!showNextDetails)}
                className={`w-full bg-[#111111] border py-3 px-4 rounded-2xl flex items-center justify-between min-w-0 group transition-all cursor-pointer ${
                  showNextDetails ? 'border-[#C5A059]/20' : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex flex-col min-w-0 pr-4 text-left">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Próximo Cliente</span>
                  {nextBooking ? (
                    <span className="text-base font-bold text-white uppercase tracking-tight truncate mt-1">
                      {nextBooking.clients?.name.split(' ')[0]}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-650 uppercase tracking-wider mt-1 block">Sem agendamento</span>
                  )}
                </div>
                {nextBooking && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#C5A059] tabular-nums">
                      {nextBooking.booking_time.slice(0, 5)}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`text-zinc-500 transition-transform duration-300 ${showNextDetails ? 'rotate-180' : ''}`}
                    >
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                )}
              </button>

              {/* Expanded Details */}
              <AnimatePresence>
                {showNextDetails && nextBooking && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 bg-[#111111] border border-white/5 rounded-2xl p-4">
                      <div className="space-y-0">
                        <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Cliente</span>
                          <span className="text-[11px] font-bold text-white truncate ml-4">{nextBooking.clients?.name}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Horário</span>
                          <span className="text-[11px] font-bold text-[#C5A059]">{nextBooking.booking_time.slice(0, 5)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Data</span>
                          <span className="text-[11px] font-bold text-white">
                            {new Date(nextBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Valor</span>
                          <span className="text-[11px] font-bold text-white">R$ {(nextBooking.total_price || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(nextBooking);
                            setShowNextDetails(false);
                          }}
                          className="flex-1 h-9 bg-white/[0.03] border border-white/[0.06] text-zinc-300 text-[9px] font-bold uppercase tracking-widest rounded-lg hover:bg-white/[0.06] transition-all cursor-pointer"
                        >
                          Ver Detalhes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendWhatsAppReminder(nextBooking);
                          }}
                          className="flex-1 h-9 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                        >
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Lucro do Dia */}
            <div className="md:col-span-1 bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Lucro do Dia</span>
                <span className="text-base font-black text-white tracking-tight tabular-nums mt-1">R$ {dailyRevenue.toFixed(0)}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-zinc-500">
                <TrendingUp size={16} />
              </div>
            </div>
          </div>

          {/* 3. BOOKINGS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
              <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.25em]">Agenda de Hoje</h2>
              
              {/* Segmented Control Tab Switcher */}
              <div className="bg-[#111111] border border-white/5 p-1 rounded-xl flex gap-1 w-full sm:w-auto max-w-sm">
                {([
                  { value: 'occupied', label: 'Ocupados' },
                  { value: 'free', label: 'Livres' },
                  { value: 'blocked', label: 'Bloqueados' }
                ] as const).map((f) => {
                  const active = filter === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setFilter(f.value)}
                      className={`flex-1 sm:px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest rounded-lg transition-all relative cursor-pointer ${
                        active ? 'text-[#C5A059]' : 'text-zinc-550 hover:text-zinc-350'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="activeFilterTabDashboard"
                          className="absolute inset-0 bg-white/[0.03] border border-white/[0.05] rounded-lg -z-10"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Carregando...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {filter === 'occupied' && (
                    occupiedBookings.length === 0 ? (
                      <motion.div 
                        key="empty-occupied"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="py-24 text-center"
                      >
                        <p className="text-zinc-700 text-[10px] uppercase tracking-widest">Nenhum agendamento para hoje</p>
                      </motion.div>
                    ) : (
                      occupiedBookings.map((booking) => (
                        <motion.div 
                          key={booking.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center bg-[#111111] border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:border-white/10"
                        >
                          <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
                            <span className="text-sm font-bold text-zinc-500 tabular-nums w-10 shrink-0">
                              {booking.booking_time.slice(0, 5)}
                            </span>
                            <div className="w-px h-4 bg-white/10 shrink-0" />
                            <h3 className="text-sm font-medium text-zinc-200 truncate">
                              {booking.clients?.name}
                            </h3>
                          </div>
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className="flex items-center justify-center px-4 py-3 text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer shrink-0"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                          </button>
                        </motion.div>
                      ))
                    )
                  )}

                  {filter === 'free' && (
                    freeSlots.length === 0 ? (
                      <motion.div 
                        key="empty-free"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="py-24 text-center"
                      >
                        <p className="text-zinc-700 text-[10px] uppercase tracking-widest">Nenhum horário livre para hoje</p>
                      </motion.div>
                    ) : (
                      freeSlots.map((slot) => (
                        <motion.div
                          key={`free-${slot}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center bg-[#111111] border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group"
                        >
                          <div className="flex-1 flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-bold text-zinc-400 tabular-nums w-10 shrink-0">{slot}</span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleBlockSlot(slot)}
                                disabled={blockingSlot === slot}
                                className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-red-400/70 hover:text-red-400 border border-white/5 hover:border-red-500/20 bg-white/[0.02] hover:bg-red-500/5 rounded-lg transition-all active:scale-95 shrink-0 disabled:opacity-50 cursor-pointer"
                              >
                                {blockingSlot === slot ? '...' : 'Bloquear'}
                              </button>
                              <button 
                                onClick={() => navigate('/admin/agendar', { state: { date: selectedDate, time: slot } })}
                                className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400 hover:text-[#C5A059] border border-white/5 hover:border-[#C5A059]/20 bg-white/[0.02] hover:bg-[#C5A059]/5 rounded-lg transition-all active:scale-95 shrink-0 cursor-pointer"
                              >
                                Agendar
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )
                  )}

                  {filter === 'blocked' && (
                    blockedBookings.length === 0 ? (
                      <motion.div 
                        key="empty-blocked"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="py-24 text-center"
                      >
                        <p className="text-zinc-700 text-[10px] uppercase tracking-widest">Nenhum horário bloqueado para hoje</p>
                      </motion.div>
                    ) : (
                      blockedBookings.map((booking) => (
                        <motion.div
                          key={`blocked-${booking.id}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center bg-[#111111] border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group"
                        >
                          <div className="flex-1 flex items-center gap-4 px-4 py-3 min-w-0">
                            <span className="text-sm font-bold text-zinc-500 tabular-nums w-10 shrink-0">
                              {booking.booking_time.slice(0, 5)}
                            </span>
                          </div>
                          <div className="flex items-center shrink-0 pr-3">
                            <button
                              type="button"
                              onClick={() => setUnblockingBooking(booking)}
                              className="text-[9px] font-bold uppercase tracking-widest text-red-400/80 hover:text-red-400 border border-red-500/10 hover:border-red-500/25 bg-red-950/10 hover:bg-red-500/5 transition-all px-3 py-1.5 rounded-lg cursor-pointer shrink-0"
                            >
                              Desbloquear
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomTabs />

      {/* MODAL */}
      <AnimatePresence>
        {completingBooking && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCompletingBooking(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm relative z-10 overflow-hidden rounded-2xl shadow-2xl p-10"
            >
              <div className="space-y-8">
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-zinc-650 uppercase tracking-[0.4em] block">Status do Serviço</span>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Finalizar Atendimento</h3>
                </div>
                
                <div className="py-8 border-y border-white/[0.03]">
                  <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest block mb-2 text-center">Cliente Selecionado</span>
                  <p className="text-2xl font-black text-white uppercase tracking-tighter text-center">
                    {completingBooking.clients?.name}
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    onClick={handleComplete}
                    className="w-full h-12 bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-200 active:scale-[0.98] transition-all"
                  >
                    Confirmar Conclusão
                  </button>
                  <button 
                    onClick={() => setCompletingBooking(null)}
                    className="w-full h-10 text-zinc-500 font-bold text-[9px] uppercase tracking-[0.3em] hover:text-white transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNBLOCK MODAL */}
      <AnimatePresence>
        {unblockingBooking && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setUnblockingBooking(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111111] border border-white/5 w-full max-w-sm relative z-10 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-8 text-center"
            >
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white uppercase tracking-[0.15em]">Desbloquear Horário</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed max-w-[260px] mx-auto">
                    Tem certeza de que deseja liberar este horário? Ele ficará disponível para agendamento dos clientes imediatamente.
                  </p>
                </div>
                
                <div className="py-4 bg-white/[0.02] border border-white/[0.04] rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.2em] block">Horário Selecionado</span>
                  <p className="text-2xl font-black text-white tracking-tighter">
                    {unblockingBooking.booking_time.slice(0, 5)}
                  </p>
                  <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider block">
                    {new Date(unblockingBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={confirmUnblock}
                    className="w-full h-11 bg-[#C5A059] text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#A68233] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Confirmar Desbloqueio
                  </button>
                  <button 
                    onClick={() => setUnblockingBooking(null)}
                    className="w-full h-10 text-zinc-500 font-bold text-[9px] uppercase tracking-[0.3em] hover:text-white transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL PANEL */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            {/* Mobile: full screen */}
            <div className="lg:hidden fixed inset-0 z-[200]">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedBooking(null)} className="absolute inset-0 bg-black/60" />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute inset-0 bg-[#0A0A0A] flex flex-col"
              >
                {/* Mobile Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
                  <button onClick={() => setSelectedBooking(null)} className="text-zinc-500 hover:text-white transition-all cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Agendamento</p>
                    <h3 className="text-sm font-bold text-white">{selectedBooking.clients?.name}</h3>
                  </div>
                </div>

                {/* Mobile Body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                  {selectedBooking.service_ids && selectedBooking.service_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedBooking.service_ids.map((id: string) => {
                        const srv = services.find(s => s.id === id);
                        return <span key={id} className="text-[9px] font-bold uppercase tracking-wider bg-[#C5A059]/10 text-[#C5A059] px-2.5 py-1 rounded-md">{srv?.name || 'Serviço'}</span>;
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                      <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Data</p>
                      <p className="text-sm font-bold text-white">{new Date(selectedBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                      <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Horário</p>
                      <p className="text-sm font-bold text-[#C5A059]">{selectedBooking.booking_time?.slice(0, 5)}</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 col-span-2">
                      <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Valor</p>
                      <p className="text-sm font-bold text-[#C5A059]">R$ {(selectedBooking.total_price || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {selectedBooking.clients?.phone && (
                    <button onClick={() => sendWhatsAppReminder(selectedBooking)} className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-300 text-[10px] font-bold uppercase tracking-widest hover:bg-white/[0.07] transition-all cursor-pointer flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </button>
                  )}
                </div>

                {/* Mobile Footer */}
                <div className="px-5 pb-6 pt-3 space-y-2 border-t border-white/[0.04]">
                  {selectedBooking.status !== 'completed' && (
                    <button onClick={() => { setCompletingBooking(selectedBooking); setSelectedBooking(null); }} className="w-full h-11 bg-[#C5A059] text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#A68233] active:scale-[0.98] transition-all cursor-pointer">
                      Concluir
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedBooking(null); navigate('/admin/agendar', { state: { rescheduleBooking: selectedBooking } }); }} className="flex-1 h-10 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-zinc-300 font-bold text-[9px] uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer">
                      Reagendar
                    </button>
                    <button onClick={async () => { if (window.confirm("Excluir este agendamento?")) { try { await deleteBooking(selectedBooking.id); setSelectedBooking(null); await loadData(); setToast({ message: 'Agendamento excluído!', type: 'success' }); } catch { setToast({ message: 'Erro ao excluir.', type: 'error' }); } } }} className="flex-1 h-10 border border-red-500/10 bg-red-500/5 text-red-400 font-bold text-[9px] uppercase tracking-[0.2em] rounded-xl hover:bg-red-500/10 transition-all cursor-pointer">
                      Excluir
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Desktop: slide-over panel */}
            <div className="hidden lg:flex fixed inset-0 z-[200] justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedBooking(null)} className="absolute inset-0 bg-black/50" />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-[400px] bg-[#0A0A0A] border-l border-white/[0.06] h-full overflow-y-auto scrollbar-hide flex flex-col"
              >
                {/* Desktop Header */}
                <div className="sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-md z-10 px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
                  <button onClick={() => setSelectedBooking(null)} className="text-zinc-500 hover:text-white transition-all cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Agendamento</p>
                  <div className="w-[18px]" />
                </div>

                {/* Desktop Body */}
                <div className="flex-1 px-5 py-5 space-y-5">
                  {/* Client */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#111111] border border-white/[0.08] flex items-center justify-center text-base font-bold text-white uppercase">
                      {selectedBooking.clients?.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{selectedBooking.clients?.name}</h3>
                      <p className="text-[11px] text-zinc-500">{selectedBooking.clients?.phone}</p>
                    </div>
                  </div>

                  {/* Services */}
                  {selectedBooking.service_ids && selectedBooking.service_ids.length > 0 && (
                    <div className="space-y-1.5">
                      {selectedBooking.service_ids.map((id: string) => {
                        const srv = services.find(s => s.id === id);
                        return (
                          <div key={id} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                            <span className="text-xs font-medium text-white">{srv?.name || 'Serviço'}</span>
                            <span className="text-xs font-bold text-[#C5A059]">R$ {Number(srv?.price || 0).toFixed(0)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Info */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="py-3 px-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                      <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Data</p>
                      <p className="text-xs font-bold text-white">{new Date(selectedBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                    </div>
                    <div className="py-3 px-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                      <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Horário</p>
                      <p className="text-xs font-bold text-[#C5A059]">{selectedBooking.booking_time?.slice(0, 5)}</p>
                    </div>
                  </div>

                  <div className="py-3 px-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Valor Total</p>
                    <p className="text-lg font-bold text-[#C5A059]">R$ {(selectedBooking.total_price || 0).toFixed(2)}</p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {selectedBooking.clients?.phone && (
                      <button onClick={() => sendWhatsAppReminder(selectedBooking)} className="w-full h-10 bg-[#C5A059] hover:bg-[#A68233] text-black text-[10px] font-bold uppercase tracking-[0.1em] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Enviar Lembrete
                      </button>
                    )}
                    {selectedBooking.status !== 'completed' && (
                      <button onClick={() => { setCompletingBooking(selectedBooking); setSelectedBooking(null); }} className="w-full h-10 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] text-white text-[10px] font-bold uppercase tracking-[0.1em] rounded-xl transition-all cursor-pointer">
                        Concluir
                      </button>
                    )}
                    <button onClick={() => { setSelectedBooking(null); navigate('/admin/agendar', { state: { rescheduleBooking: selectedBooking } }); }} className="w-full h-10 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] text-white text-[10px] font-bold uppercase tracking-[0.1em] rounded-xl transition-all cursor-pointer">
                      Reagendar
                    </button>
                  </div>

                  {/* Delete */}
                  <div className="pt-3 border-t border-white/[0.04]">
                    <button onClick={async () => { if (window.confirm("Excluir este agendamento?")) { try { await deleteBooking(selectedBooking.id); setSelectedBooking(null); await loadData(); setToast({ message: 'Agendamento excluído!', type: 'success' }); } catch { setToast({ message: 'Erro ao excluir.', type: 'error' }); } } }} className="w-full h-9 bg-white/[0.03] border border-white/[0.06] hover:bg-red-500/[0.06] hover:border-red-500/10 text-zinc-500 hover:text-red-400 text-[9px] font-bold uppercase tracking-[0.1em] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5">
                      Excluir agendamento
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-5 py-3.5 bg-[#111111] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md">
            <div className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#C5A059]'}`} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">{toast.message}</p>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
