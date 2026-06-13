// AdminDashboard - Elite Version 2.2 - Ultimate Immersive UI
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getBookings, getClients, getServices, updateBookingStatus } from '../lib/api';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Plus, 
  Search,
  TrendingUp,
  Clock,
  LogOut,
  ChevronLeft,
  User,
  CheckCircle,
  Scissors,
  CalendarDays,
  ArrowLeft,
  Smartphone,
  ChevronRight,
  Trash2,
  History,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import type { Service, Booking, Client } from '../types';

interface ExtendedBooking extends Booking {
  clients?: {
    name: string;
    phone: string;
  };
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('agenda');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<ExtendedBooking | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
  
  const [selectedWeeklyDate, setSelectedWeeklyDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [bookingsData, clientsData, servicesData] = await Promise.all([
        getBookings() as Promise<Booking[]>,
        getClients() as Promise<Client[]>,
        getServices() as Promise<Service[]>
      ]);
      setBookings(bookingsData || []);
      setClients(clientsData || []);
      setServices(servicesData || []);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao carregar dados do banco.', type: 'error' });
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
  }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateBookingStatus(id, status);
      setToast({ message: `Agendamento ${status === 'cancelled' ? 'cancelado' : 'atualizado'} com sucesso!`, type: 'success' });
      setViewingBooking(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao atualizar agendamento.', type: 'error' });
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time || !viewingBooking) return;
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          booking_date: rescheduleData.date, 
          booking_time: rescheduleData.time,
          status: 'pending' 
        })
        .eq('id', viewingBooking.id);
      
      if (updateError) throw updateError;
      
      setToast({ message: 'Reagendamento concluído!', type: 'success' });
      setIsRescheduling(false);
      setViewingBooking(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao reagendar.', type: 'error' });
    }
  };

  const handleSendMessage = (client?: Client) => {
    const target = client || viewingBooking?.clients || viewingClient;
    if (!target?.phone) return;
    const message = `Olá ${target.name}, aqui é da Black Diamond!`;
    window.open(`https://wa.me/55${target.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este cliente?')) return;
    try {
      const { error: deleteError } = await supabase.from('clients').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setToast({ message: 'Cliente removido.', type: 'success' });
      setViewingClient(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao remover cliente.', type: 'error' });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.booking_date === today);
  
  const todayRevenue = todayBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const weeklyBookings = bookings.filter(b => new Date(b.booking_date) >= lastWeekDate);
  const weeklyRevenue = weeklyBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  const lastMonthDate = new Date();
  lastMonthDate.setDate(lastMonthDate.getDate() - 30);
  const monthlyBookings = bookings.filter(b => new Date(b.booking_date) >= lastMonthDate);
  const monthlyRevenue = monthlyBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  const availableSlots = 21 - todayBookings.length;

  const timeSlots = [
    "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", 
    "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", 
    "16:30", "17:00", "17:30", "18:00", "18:30"
  ];

  const weekDays = useMemo(() => {
    const days = [];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);

    for (let i = 0; i < 6; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({
        full: d.toISOString().split('T')[0],
        short: d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', ''),
        num: d.getDate().toString().padStart(2, '0')
      });
    }
    return days;
  }, []);

  const menuItems = [
    { id: 'agenda', label: 'Agenda', icon: Clock },
    { id: 'faturamento', label: 'Finanças', icon: TrendingUp },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'semanal', label: 'Semanal', icon: Calendar },
  ];

  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const occupiedSlots = timeSlots
    .map(time => ({ time, booking: todayBookings.find(b => b.booking_time.slice(0, 5) === time) }))
    .filter(slot => slot.booking);

  const nextBooking = occupiedSlots
    .filter(slot => slot.time >= currentTime)
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  const [viewMode, setViewMode] = useState<'semanal' | 'mensal'>('semanal');

  const handleCreateBooking = () => {
    setIsCreatingBooking(false);
    setToast({ message: 'Agendamento realizado com sucesso!', type: 'success' });
    fetchData();
  };

  if (viewingClient) {
    const clientHistory = bookings.filter(b => b.client_id === viewingClient.id).sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());
    const totalSpent = clientHistory.filter(b => b.status === 'completed' || b.status === 'pending').reduce((sum, b) => sum + Number(b.total_price), 0);

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-12 lg:p-24 selection:bg-[#C5A059]/30 font-sans"
      >
        <header className="max-w-6xl mx-auto flex items-center justify-between mb-16 md:mb-32">
          <button onClick={() => setViewingClient(null)} className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white hover:bg-white/10 transition-all group shadow-2xl backdrop-blur-xl">
            <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="hidden sm:block px-6 py-2 bg-[#C5A059]/5 border border-[#C5A059]/20 rounded-full backdrop-blur-md">
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C5A059]">Elite Database</span>
          </div>
        </header>

        <main className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-20 lg:gap-32">
            <div className="space-y-24">
              {/* Header: Avatar Side-by-Side with Name */}
              <section className="flex flex-row items-end gap-6 md:gap-12">
                 <div className="relative group shrink-0">
                    <div className="absolute -inset-1 bg-gradient-to-tr from-[#C5A059] to-white/20 rounded-[2.5rem] md:rounded-[3.2rem] blur opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="w-24 h-24 md:w-56 md:h-56 rounded-[2.2rem] md:rounded-[3rem] bg-[#0A0A0A] border border-white/10 overflow-hidden relative z-10 shadow-2xl">
                       <img 
                         src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(viewingClient.name)}&backgroundColor=0a0a0a&fontFamily=serif&fontSize=40`} 
                         alt={viewingClient.name} 
                         className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700"
                       />
                    </div>
                 </div>
                 <div className="space-y-2 md:space-y-6 pb-2 md:pb-4 flex-1 text-left">
                    <div className="space-y-1 md:space-y-3">
                       <span className="text-[8px] md:text-[10px] font-black text-[#C5A059] uppercase tracking-[0.6em] ml-1">Perfil Premium</span>
                       <h2 className="text-3xl md:text-[7rem] font-black text-white uppercase tracking-tighter leading-[0.8] break-words">{viewingClient.name}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 md:gap-8 pt-2 md:pt-6 text-zinc-500">
                       <div className="flex items-center gap-2 md:gap-4">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981]" />
                          <span className="text-[11px] md:text-base font-black tracking-widest">{viewingClient.phone}</span>
                       </div>
                       <div className="w-px h-4 md:h-6 bg-white/10 hidden md:block" />
                       <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest italic opacity-30">Membro desde {new Date(viewingClient.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                 </div>
              </section>

              {/* Stats Grid: Focus on LTV */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                 <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 p-12 rounded-[3.5rem] md:rounded-[4.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-[#C5A059]/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-[#C5A059]/5 rounded-full blur-[100px] -mr-30 -mt-30 group-hover:bg-[#C5A059]/10 transition-all" />
                    <DollarSign size={28} className="text-[#C5A059] mb-10 opacity-30" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] mb-6">Investimento Total</p>
                    <div className="flex items-baseline gap-4 relative z-10">
                       <span className="text-2xl md:text-3xl font-bold text-[#C5A059] opacity-30 italic">R$</span>
                       <p className="text-7xl md:text-[8rem] font-black text-[#C5A059] tracking-tighter drop-shadow-2xl leading-none">{totalSpent.toFixed(0)}</p>
                    </div>
                 </div>
                 <div className="bg-white/[0.02] border border-white/5 p-12 rounded-[3.5rem] md:rounded-[4.5rem] flex flex-col justify-end shadow-2xl group hover:border-white/10 transition-all duration-500">
                    <Users size={28} className="text-zinc-800 mb-10 opacity-30" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] mb-6">Número de Visitas</p>
                    <div className="flex items-baseline gap-5">
                       <p className="text-7xl md:text-[8rem] font-black text-white tracking-tighter leading-none">{clientHistory.length}</p>
                       <p className="text-[10px] md:text-[12px] font-black text-zinc-700 uppercase tracking-[0.3em]">Cortes Realizados</p>
                    </div>
                 </div>
              </section>

              {/* Attendance List */}
              <section className="space-y-12 md:space-y-16">
                 <div className="flex items-center justify-between border-b border-white/5 pb-10 md:pb-14">
                    <div className="flex items-center gap-6">
                       <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/10 flex items-center justify-center border border-[#C5A059]/20 shadow-inner">
                          <History size={20} className="text-[#C5A059]" />
                       </div>
                       <h3 className="text-[12px] font-black uppercase tracking-[0.6em] text-white">Histórico de Elite</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest">{clientHistory.length} Registros</span>
                 </div>
                 <div className="space-y-6 md:space-y-8">
                    {clientHistory.length > 0 ? clientHistory.map((b, i) => (
                      <div key={i} className="p-10 md:p-14 flex items-center justify-between group bg-[#0D0D0D]/50 border border-white/5 rounded-[3rem] md:rounded-[4rem] hover:bg-white/[0.03] transition-all duration-700 hover:border-white/10 shadow-3xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#C5A059] opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-10 md:gap-16">
                           <span className="text-4xl md:text-6xl font-black text-zinc-900 group-hover:text-[#C5A059]/20 transition-all duration-700">{(clientHistory.length - i).toString().padStart(2, '0')}</span>
                           <div>
                              <p className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight group-hover:text-[#C5A059] transition-colors duration-700 italic">Corte Black Diamond</p>
                              <div className="flex items-center gap-6 md:gap-8 mt-4">
                                 <div className="flex items-center gap-3">
                                    <Calendar size={14} className="text-zinc-700" />
                                    <p className="text-[11px] md:text-sm text-zinc-500 font-black tracking-[0.2em] uppercase">{new Date(b.booking_date).toLocaleDateString('pt-BR')}</p>
                                 </div>
                                 <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                                 <div className="flex items-center gap-3">
                                    <Clock size={14} className="text-zinc-700" />
                                    <p className="text-[11px] md:text-sm text-zinc-500 font-black tracking-[0.2em] uppercase">{b.booking_time.slice(0, 5)}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-12 md:gap-20">
                           <div className="text-right hidden sm:block">
                              <p className="text-[10px] text-zinc-700 font-black uppercase tracking-widest mb-2">Faturado</p>
                              <p className="text-2xl md:text-4xl font-black text-white italic tracking-tighter">R$ {Number(b.total_price).toFixed(0)}</p>
                           </div>
                           <CheckCircle size={28} className="text-[#C5A059]/10 group-hover:text-emerald-500/50 transition-all duration-700 scale-125" />
                        </div>
                      </div>
                    )) : <p className="text-sm text-zinc-600 italic">Nenhum registro de serviço encontrado.</p>}
                 </div>
              </section>
            </div>

            {/* Sidebar Actions: Elite Minimalist */}
            <aside className="space-y-10 lg:sticky lg:top-32 h-fit">
               <div className="bg-[#0D0D0D]/80 border border-white/10 p-12 md:p-16 rounded-[4rem] md:rounded-[5rem] backdrop-blur-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent" />
                  <p className="text-[11px] font-black text-zinc-800 uppercase tracking-[0.8em] text-center mb-16">Premium Actions</p>
                  <div className="space-y-5 md:space-y-6">
                     <button onClick={() => handleSendMessage()} className="w-full h-24 md:h-28 rounded-[2rem] bg-white text-black font-black text-[13px] md:text-[14px] uppercase tracking-[0.4em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-6 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-[0.97] group/btn">
                        <ExternalLink size={20} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" /> WhatsApp
                     </button>
                     <button 
                       onClick={() => {
                         const target = viewingClient;
                         const message = `Olá ${target.name}, notamos que já faz um tempo que você não nos visita! Que tal agendar seu próximo corte na Black Diamond?`;
                         window.open(`https://wa.me/55${target.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                       }} 
                       className="w-full h-20 md:h-24 rounded-[2rem] border border-white/10 text-white font-black text-[11px] md:text-[12px] uppercase tracking-[0.4em] hover:bg-white/[0.03] hover:border-white/20 transition-all flex items-center justify-center gap-5 group/btn"
                     >
                        <Smartphone size={20} className="text-[#C5A059] group-hover/btn:scale-110 transition-transform" /> Notificar
                     </button>
                  </div>
                  <div className="mt-20 pt-12 border-t border-white/5">
                     <button onClick={() => handleDeleteClient(viewingClient.id)} className="w-full py-4 text-zinc-800 hover:text-red-500 transition-all text-[10px] font-black uppercase tracking-[0.8em] flex items-center justify-center gap-4 opacity-50 hover:opacity-100">
                        <Trash2 size={16} /> Excluir Registro
                     </button>
                  </div>
               </div>
            </aside>
          </div>
        </main>
      </motion.div>
    );
  }

  if (viewingBooking) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-12 lg:p-24 selection:bg-[#C5A059]/30 font-sans flex items-center justify-center"
      >
        <div className="max-w-7xl w-full">
          <header className="flex items-center justify-between mb-20">
            <button onClick={() => { setViewingBooking(null); setIsRescheduling(false); }} className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all group shadow-2xl backdrop-blur-xl">
              <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="px-10 py-3 bg-white/5 border border-white/10 rounded-full backdrop-blur-2xl">
               <span className="text-[10px] font-black uppercase tracking-[0.8em] text-zinc-500">Service Insight</span>
            </div>
          </header>

          {!isRescheduling ? (
            <div className="bg-[#0D0D0D]/80 border border-white/5 rounded-[5rem] md:rounded-[6rem] p-10 md:p-28 shadow-[0_80px_150px_-30px_rgba(0,0,0,0.9)] relative overflow-hidden group backdrop-blur-[100px]">
               <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-[#C5A059]/5 rounded-full blur-[150px] -mr-80 -mt-80 pointer-events-none group-hover:bg-[#C5A059]/10 transition-all duration-1000" />
               
               <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-20 md:gap-32 items-center">
                  <div className="space-y-14 md:space-y-20 text-center lg:text-left">
                     <div className="space-y-8">
                        <div className="inline-flex items-center gap-4 px-6 py-2 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full mb-4">
                           <div className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
                           <span className="text-[11px] font-black text-[#C5A059] uppercase tracking-[0.6em]">Agendamento Ativo</span>
                        </div>
                        <h2 className="text-6xl md:text-[11rem] font-black text-white uppercase tracking-tighter leading-[0.75] break-words drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">{viewingBooking.clients?.name}</h2>
                     </div>
                     
                     <div className="flex flex-wrap items-center justify-center lg:justify-start gap-12 md:gap-16 text-zinc-500">
                        <button onClick={() => handleSendMessage()} className="flex items-center gap-6 hover:text-[#C5A059] transition-all group/btn">
                           <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center group-hover/btn:border-[#C5A059]/50 group-hover/btn:bg-[#C5A059]/5 transition-all shadow-xl">
                              <Smartphone size={24} />
                           </div>
                           <span className="text-lg font-black tracking-[0.4em]">{viewingBooking.clients?.phone}</span>
                        </button>
                        <div className="flex items-center gap-6 group/btn">
                           <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-xl">
                              <Calendar size={24} />
                           </div>
                           <span className="text-lg font-black tracking-[0.4em] uppercase">{new Date(viewingBooking.booking_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-20 max-w-3xl">
                        <div className="bg-white/[0.02] border border-white/5 p-12 rounded-[3rem] space-y-4 hover:border-white/10 transition-all duration-500 text-left group/card">
                           <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] group-hover/card:text-zinc-500 transition-colors">Serviço Especialista</p>
                           <p className="text-2xl font-black text-white uppercase italic tracking-tighter leading-tight">Corte Black Diamond</p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 p-12 rounded-[3rem] space-y-4 hover:border-[#C5A059]/30 transition-all duration-500 text-left group/card">
                           <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] group-hover/card:text-[#C5A059]/50 transition-colors">Valor Investido</p>
                           <div className="flex items-baseline gap-4">
                              <span className="text-2xl font-bold text-[#C5A059] opacity-30 italic">R$</span>
                              <p className="text-5xl font-black text-[#C5A059] tracking-tighter leading-none">{Number(viewingBooking.total_price).toFixed(0)}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col items-center gap-20 md:gap-24">
                     <div className="space-y-8 text-center group/time">
                        <p className="text-[12px] font-black text-zinc-800 uppercase tracking-[1em] group-hover/time:text-[#C5A059] transition-colors ml-4">Start Time</p>
                        <p className="text-[10rem] md:text-[15rem] font-black text-white leading-none tracking-tighter drop-shadow-[0_0_80px_rgba(255,255,255,0.08)] group-hover/time:scale-110 transition-transform duration-1000">
                           {viewingBooking.booking_time.slice(0, 5)}
                        </p>
                     </div>
                     <div className="w-full space-y-4 px-6 md:px-0">
                        <button onClick={() => { setRescheduleData({ date: viewingBooking.booking_date, time: viewingBooking.booking_time.slice(0, 5) }); setIsRescheduling(true); }} className="w-full h-28 rounded-[2.5rem] bg-white text-black font-black text-[15px] uppercase tracking-[0.6em] hover:bg-zinc-200 transition-all shadow-[0_30px_60px_rgba(255,255,255,0.15)] active:scale-[0.96]">
                           REAGENDAR
                        </button>
                        <button onClick={() => handleUpdateStatus(viewingBooking.id, 'cancelled')} className="w-full py-6 text-zinc-800 hover:text-red-500 transition-all text-[11px] font-black uppercase tracking-[0.8em] flex items-center justify-center gap-4 opacity-40 hover:opacity-100">
                           <Trash2 size={18} /> CANCELAR CORTE
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-16">
               <div className="flex items-center gap-8 mb-16">
                  <button onClick={() => setIsRescheduling(false)} className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white transition-all shadow-2xl"><ArrowLeft size={28} /></button>
                  <h2 className="text-5xl font-black text-white uppercase tracking-widest italic text-left leading-none">NOVA JANELA</h2>
               </div>
               <div className="space-y-16">
                  <div className="space-y-6">
                    <label className="text-[12px] font-black text-zinc-700 uppercase tracking-[0.8em] ml-2">DATA DO ATENDIMENTO</label>
                    <input type="date" value={rescheduleData.date} onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})} className="w-full bg-white/[0.02] border border-white/10 text-white p-10 rounded-[3rem] outline-none focus:border-[#C5A059] transition-all text-lg font-black uppercase tracking-widest shadow-[0_30px_60px_rgba(0,0,0,0.5)]" />
                  </div>
                  <div className="space-y-8">
                    <label className="text-[12px] font-black text-zinc-700 uppercase tracking-[0.8em] ml-2">ESCOLHER HORÁRIO</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {timeSlots.map(t => (
                        <button key={t} onClick={() => setRescheduleData({...rescheduleData, time: t})} className={`py-8 text-[14px] font-black border rounded-3xl transition-all duration-700 ${rescheduleData.time === t ? 'border-[#C5A059] bg-[#C5A059]/10 text-white shadow-[0_0_30px_rgba(197,160,89,0.3)]' : 'border-white/5 bg-white/[0.01] text-zinc-600 hover:border-white/20'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-10">
                    <button onClick={handleReschedule} className="w-full h-28 rounded-[2.5rem] bg-[#C5A059] text-black font-black text-sm uppercase tracking-[0.6em] hover:bg-[#F5E0A3] transition-all shadow-[0_40px_80px_rgba(197,160,89,0.3)] active:scale-[0.96]">EFETIVAR MUDANÇA</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (isCreatingBooking) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-12 selection:bg-[#C5A059]/30">
        <header className="max-w-5xl mx-auto flex items-center justify-between mb-20">
          <button onClick={() => setIsCreatingBooking(false)} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all shadow-2xl"><ChevronLeft size={24} /></button>
          <h1 className="text-2xl font-black uppercase tracking-[0.4em] italic text-[#C5A059]">Elite Booking</h1>
        </header>
        <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-20">
          <div className="space-y-16">
            <section className="space-y-8">
              <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.6em] flex items-center gap-4">
                 <div className="w-8 h-8 rounded-xl bg-[#C5A059]/10 flex items-center justify-center border border-[#C5A059]/20">
                    <User size={14} className="text-[#C5A059]" />
                 </div>
                 Dados do Cliente
              </h3>
              <div className="space-y-5">
                <input type="text" placeholder="NOME COMPLETO" className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] h-20 px-10 outline-none focus:border-[#C5A059] transition-all text-xs font-black uppercase tracking-widest placeholder:text-zinc-800 shadow-inner" />
                <input type="tel" placeholder="WHATSAPP (DDD)" className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] h-20 px-10 outline-none focus:border-[#C5A059] transition-all text-xs font-black uppercase tracking-widest placeholder:text-zinc-800 shadow-inner" />
              </div>
            </section>
            <section className="space-y-8">
              <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.6em] flex items-center gap-4">
                 <div className="w-8 h-8 rounded-xl bg-[#C5A059]/10 flex items-center justify-center border border-[#C5A059]/20">
                    <Scissors size={14} className="text-[#C5A059]" />
                 </div>
                 Serviço Especialista
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {services.map((s) => (
                  <button key={s.id} className="group flex items-center justify-between p-8 bg-[#0D0D0D] border border-white/5 rounded-[2rem] hover:bg-white/[0.03] hover:border-[#C5A059]/30 transition-all duration-700 shadow-xl">
                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-white transition-colors">{s.name}</span>
                    <span className="text-[12px] font-black text-[#C5A059] italic">R$ {Number(s.price).toFixed(0)}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="space-y-16">
            <section className="space-y-8">
              <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.6em] flex items-center gap-4">
                 <div className="w-8 h-8 rounded-xl bg-[#C5A059]/10 flex items-center justify-center border border-[#C5A059]/20">
                    <Calendar size={14} className="text-[#C5A059]" />
                 </div>
                 Agenda Elite
              </h3>
              <div className="bg-[#0D0D0D] border border-white/5 p-10 rounded-[3rem] space-y-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                <input type="date" className="w-full bg-black/50 border border-white/10 rounded-2xl py-6 px-8 outline-none text-[12px] font-black uppercase tracking-widest focus:border-[#C5A059] shadow-inner text-white" />
                <div className="grid grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-4 custom-scrollbar">
                  {timeSlots.map(t => <button key={t} className="py-5 text-[11px] font-black border border-white/5 rounded-2xl bg-white/[0.01] hover:bg-[#C5A059] hover:text-black transition-all uppercase shadow-md">{t}</button>)}
                </div>
              </div>
            </section>
            <button onClick={handleCreateBooking} className="w-full h-24 rounded-[2.5rem] bg-[#C5A059] text-black font-black uppercase tracking-[0.4em] text-xs hover:bg-[#F5E0A3] transition-all shadow-[0_40px_80px_rgba(197,160,89,0.3)] active:scale-[0.97]">EFETUAR AGENDAMENTO</button>
          </div>
        </main>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-400 font-sans selection:bg-[#C5A059]/30 pb-20 lg:pb-0">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className={`fixed top-10 left-1/2 md:left-[calc(50%+160px)] z-[100] px-8 py-4 rounded-xl border backdrop-blur-md shadow-2xl ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex relative z-10">
        <aside className="w-72 h-screen sticky top-0 bg-[#0A0A0A] border-r border-white/5 flex flex-col hidden lg:flex shadow-2xl">
          <div className="flex-1 py-14 flex flex-col">
            <div className="flex items-center gap-5 mb-20 group cursor-pointer px-10" onClick={() => navigate('/')}>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-[#C5A059]/30 transition-all shadow-inner">
                <img src="/assets/logo.webp" alt="Black Diamond" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-white font-black text-sm tracking-[0.2em] uppercase leading-none">Black Diamond</h1>
                <span className="text-[9px] text-[#C5A059] font-bold uppercase tracking-[0.4em] mt-1">Elite System</span>
              </div>
            </div>

            <nav className="space-y-2 px-4">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-500 group relative ${
                      isActive 
                      ? 'text-white' 
                      : 'text-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-pill"
                        className="absolute inset-0 bg-white/[0.03] border border-white/5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.02)]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <item.icon size={20} className={`relative z-10 transition-colors duration-500 ${isActive ? 'text-[#C5A059]' : 'text-zinc-700 group-hover:text-zinc-500'}`} />
                    <span className="relative z-10 text-[10px] uppercase tracking-[0.3em] font-black">{item.label}</span>
                    {isActive && <div className="absolute right-6 w-1 h-1 rounded-full bg-[#C5A059] shadow-[0_0_10px_#C5A059]" />}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-8 border-t border-white/5">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl text-zinc-700 hover:text-red-400 hover:bg-red-500/5 transition-all text-[9px] font-black uppercase tracking-[0.4em]"
            >
              <LogOut size={16} />
              Sair do Sistema
            </button>
          </div>
        </aside>
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/80 backdrop-blur-2xl border-t border-white/5 px-4 py-4 flex items-center justify-around z-50 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-[2rem]">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1.5 transition-all relative ${isActive ? 'text-[#C5A059]' : 'text-zinc-600'}`}
              >
                <item.icon size={18} className={isActive ? 'drop-shadow-[0_0_8px_rgba(197,160,89,0.5)]' : ''} />
                <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
                {isActive && <motion.div layoutId="mobile-indicator" className="absolute -top-4 w-5 h-0.5 bg-[#C5A059] rounded-full shadow-[0_0_10px_#C5A059]" />}
              </button>
            );
          })}
        </nav>
        <main className="flex-1 min-h-screen lg:px-12 px-4 py-8 overflow-x-hidden">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{activeTab === 'agenda' ? 'Agenda Diária' : activeTab === 'faturamento' ? 'Faturamento' : activeTab === 'clientes' ? 'Meus Clientes' : 'Agenda da Semana'}</h1>
              {activeTab === 'clientes' && <div className="mt-2 inline-block px-3 py-1 bg-white/[0.02] border border-white/5 rounded backdrop-blur-md"><span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-widest">{clients.length} CLIENTES NO TOTAL</span></div>}
            </div>
            <div className="flex items-center gap-4">
              {activeTab === 'clientes' ? <button className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-5 py-2 rounded-xl font-bold text-[10px] transition-all uppercase tracking-wide">💬 ENVIAR P/ TODOS</button> : activeTab === 'faturamento' ? null : <button onClick={() => setIsCreatingBooking(true)} className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-5 py-2 rounded-xl font-bold text-[10px] transition-all uppercase tracking-wide shadow-lg"><Plus size={14} /><span>Novo Corte</span></button>}
            </div>
          </header>
          {loading ? <div className="flex items-center justify-center h-[50vh]"><div className="w-10 h-10 border-3 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div></div> : (
            <AnimatePresence mode="wait">
              {activeTab === 'agenda' && (
                <motion.div key="agenda" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 md:gap-12">
                  <div className="space-y-12">
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.2em]">Próximo Corte</h3>
                      {nextBooking ? (
                        <div onClick={() => nextBooking.booking && setViewingBooking(nextBooking.booking)} className="bg-white/[0.03] border-y border-r border-white/5 border-l-4 border-l-[#C5A059] shadow-lg rounded-xl p-6 md:p-8 flex items-center justify-between transition-all cursor-pointer hover:bg-white/[0.05]">
                          <div className="flex items-center gap-6 md:gap-8">
                            <span className="text-3xl md:text-5xl font-extrabold text-[#C5A059] tracking-tighter">{nextBooking.time}</span>
                            <div className="h-10 w-[1px] bg-white/10" />
                            <div><p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Cliente</p><p className="text-lg md:text-2xl font-bold text-white uppercase tracking-tight break-words">{nextBooking.booking?.clients?.name}</p></div>
                          </div>
                          <ChevronRight size={20} className="text-zinc-700" />
                        </div>
                      ) : <div className="flex flex-col items-center justify-center py-12"><p className="text-sm text-neutral-500 italic font-medium">Nenhum corte agendado.</p></div>}
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Agenda do Dia</h3>
                      {occupiedSlots.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {occupiedSlots.map((slot, i) => (
                            <div key={i} onClick={() => slot.booking && setViewingBooking(slot.booking)} className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all hover:bg-white/[0.04] cursor-pointer group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 md:gap-5">
                                  <span className="text-lg md:text-xl font-bold text-white group-hover:text-[#C5A059] transition-colors">{slot.time}</span>
                                  <div className="w-[1px] h-5 bg-[#C5A059]/30" />
                                  <span className="text-xs md:text-sm font-bold text-zinc-300 uppercase tracking-tight truncate max-w-[120px]">{slot.booking?.clients?.name}</span>
                                </div>
                                <ChevronRight size={14} className="text-zinc-600 group-hover:text-[#C5A059]" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <div className="flex flex-col items-center justify-center py-12 border border-white/5 rounded-2xl border-dashed"><p className="text-xs text-neutral-500 italic">Tudo livre por aqui hoje.</p></div>}
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between"><h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Slots Livres</h3><span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span></div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                        {timeSlots.filter(time => !todayBookings.some(b => b.booking_time.slice(0, 5) === time)).map((time) => (
                          <div key={time} onClick={() => setIsCreatingBooking(true)} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-white/10 hover:border-[#C5A059]/50 cursor-pointer transition-colors group">
                            <span className="text-base md:text-lg font-bold text-white group-hover:text-[#C5A059] transition-colors">{time}</span>
                            <span className="text-[8px] text-neutral-500 uppercase tracking-widest mt-1">Disponível</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6 hidden lg:block">
                    <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md shadow-2xl rounded-2xl p-8 transition-all hover:bg-white/[0.04] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-[#D4AF37]/10" />
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-6">Receita Hoje</span>
                      <div className="flex items-baseline gap-2"><span className="text-xl font-bold text-[#D4AF37] opacity-40">R$</span><span className="text-4xl font-black text-[#D4AF37] tracking-tighter">{todayRevenue.toFixed(0)}</span></div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md shadow-2xl rounded-2xl p-8 relative overflow-hidden group"><div className="flex flex-col"><span className="text-4xl font-black text-white tracking-tighter leading-none">{availableSlots}</span><span className="text-[9px] text-neutral-500 font-bold uppercase tracking-[0.2em] mt-2">Horários Vagos</span></div></div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'semanal' && (
                <motion.div key="semanal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                  <div className="flex flex-wrap gap-2 pb-8 border-b border-white/5">
                    {weekDays.map((day, i) => (
                      <button key={i} onClick={() => setSelectedWeeklyDate(day.full)} className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border transition-all duration-300 ${selectedWeeklyDate === day.full ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' : 'border-white/5 bg-white/[0.02] text-zinc-600 hover:border-white/20'}`}><span className="text-[7px] font-bold uppercase mb-1 tracking-widest">{day.short}</span><span className="text-base font-black">{day.num}</span></button>
                    ))}
                  </div>
                  <div className="space-y-6">
                     <h3 className="text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.2em]">Agenda do dia {new Date(selectedWeeklyDate + 'T12:00:00').toLocaleDateString('pt-BR')}</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bookings.filter(b => b.booking_date === selectedWeeklyDate).length > 0 ? bookings.filter(b => b.booking_date === selectedWeeklyDate).map((b, i) => (
                          <div key={i} onClick={() => setViewingBooking(b)} className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-5 rounded-2xl shadow-xl transition-all hover:bg-white/[0.04] cursor-pointer group"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><span className="text-lg font-bold text-white">{b.booking_time.slice(0, 5)}</span><div className="w-px h-4 bg-white/10" /><span className="text-xs font-bold text-zinc-300 uppercase truncate max-w-[100px]">{b.clients?.name}</span></div><ChevronRight size={14} className="text-zinc-600 group-hover:text-[#C5A059] transition-colors" /></div></div>
                        )) : <div className="col-span-full flex flex-col items-center justify-center py-16"><CalendarDays size={48} className="text-white/[0.03] mb-4" /><p className="text-xs text-neutral-600 italic uppercase tracking-widest">Nenhum agendamento para este dia.</p></div>}
                     </div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'faturamento' && (
                <motion.div key="faturamento" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                  <div className="flex justify-center">
                    <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-2xl backdrop-blur-xl">
                      {[
                        { id: 'semanal', label: 'Visão Semanal' },
                        { id: 'mensal', label: 'Visão Mensal' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setViewMode(tab.id as 'semanal' | 'mensal')}
                          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                            viewMode === tab.id 
                            ? 'bg-[#C5A059] text-black shadow-[0_10px_20px_rgba(197,160,89,0.2)]' 
                            : 'text-zinc-600 hover:text-zinc-400'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {viewMode === 'semanal' ? (
                    <div className="space-y-8">
                      <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 backdrop-blur-md p-10 md:p-16 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4"><DollarSign size={14} className="text-[#C5A059]" /><span className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] uppercase">Faturamento Semanal</span></div>
                        <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-[#D4AF37] opacity-40">R$</span><h2 className="text-5xl md:text-7xl font-black text-[#D4AF37] tracking-tighter leading-none">{weeklyRevenue.toFixed(0)}</h2></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[{ label: 'Cancelados', value: weeklyBookings.filter(b => b.status === 'cancelled').length.toString(), icon: Scissors }, { label: 'Novos Clientes', value: clients.length.toString(), icon: Users }, { label: 'Concluídos', value: weeklyBookings.filter(b => b.status !== 'cancelled').length.toString(), icon: CheckCircle }].map((stat, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col justify-between h-32">
                            <div className="flex justify-between items-start"><p className="text-[9px] text-neutral-500 uppercase tracking-widest font-black">{stat.label}</p><stat.icon size={14} className="text-zinc-600" /></div>
                            <p className="text-3xl font-black text-white tracking-tight">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 backdrop-blur-md p-10 md:p-16 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4"><DollarSign size={14} className="text-[#C5A059]" /><span className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] uppercase">Faturamento Mensal</span></div>
                        <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-[#D4AF37] opacity-40">R$</span><h2 className="text-5xl md:text-7xl font-black text-[#D4AF37] tracking-tighter leading-none">{monthlyRevenue.toFixed(0)}</h2></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-2xl relative group overflow-hidden transition-all hover:bg-white/[0.04]"><p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black mb-4">Cancelados</p><p className="text-4xl font-black text-white tracking-tighter">{monthlyBookings.filter(b => b.status === 'cancelled').length.toString()}</p><Scissors size={20} className="absolute top-6 right-6 text-zinc-600/10" /></div>
                        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-2xl relative group overflow-hidden transition-all hover:bg-white/[0.04]"><p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black mb-4">Novos Clientes</p><p className="text-4xl font-black text-[#D4AF37] tracking-tighter">{clients.length}</p><Users size={20} className="absolute top-6 right-6 text-zinc-600/10" /></div>
                        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-2xl relative group overflow-hidden transition-all hover:bg-white/[0.04]"><p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black mb-4">Atendimentos</p><p className="text-4xl font-black text-white tracking-tighter">{monthlyBookings.length}</p><CheckCircle size={20} className="absolute top-6 right-6 text-zinc-600/10" /></div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
              {activeTab === 'clientes' && (
                <motion.div key="clientes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                  <div className="w-full max-w-2xl mx-auto space-y-10 py-4">
                    <div className="relative group"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#C5A059] transition-colors" size={18} /><input type="text" placeholder="BUSCAR CLIENTE..." className="w-full bg-white/[0.03] border border-white/10 rounded-2xl h-16 pl-16 pr-6 outline-none text-xs font-bold text-white focus:border-[#C5A059] transition-all placeholder:text-zinc-800 uppercase tracking-widest shadow-xl" /></div>
                    <div className="grid grid-cols-1 gap-3">
                      {clients.length > 0 ? clients.map((client) => (
                        <div key={client.id} onClick={() => setViewingClient(client)} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center justify-between hover:bg-white/5 hover:border-white/10 transition-colors group cursor-pointer">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden group-hover:border-[#C5A059]/30 transition-all shrink-0">
                               <img 
                                 src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(client.name)}&backgroundColor=0a0a0a&fontFamily=serif&fontSize=40`} 
                                 alt={client.name} 
                                 className="w-full h-full object-cover opacity-80"
                               />
                            </div>
                            <div><p className="text-white font-bold uppercase tracking-tight text-sm">{client.name}</p><p className="text-[10px] text-zinc-600 font-medium tracking-wider">{client.phone}</p></div>
                          </div>
                          <ChevronRight size={16} className="text-zinc-700 group-hover:text-[#C5A059] transition-colors" />
                        </div>
                      )) : <div className="flex flex-col items-center justify-center py-12"><p className="text-xs text-neutral-600 font-black uppercase tracking-[0.2em]">Sua base de clientes está vazia.</p></div>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
