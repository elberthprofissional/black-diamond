// AdminDashboard - Elite Version 3.0 - Native App Experience
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-10 font-sans selection:bg-[#C5A059]/30"
      >
        <header className="max-w-4xl mx-auto flex items-center justify-between mb-8 md:mb-12">
          <button onClick={() => setViewingClient(null)} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Perfil do Cliente</span>
        </header>

        <main className="max-w-4xl mx-auto space-y-6">
          {/* Header Card: Avatar + Essential Info */}
          <section className="bg-neutral-900/50 border border-white/5 p-6 rounded-2xl flex items-center gap-6">
             <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-black border border-white/10 overflow-hidden shrink-0">
                <img 
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(viewingClient.name)}&backgroundColor=0a0a0a&fontFamily=serif&fontSize=40`} 
                  alt={viewingClient.name} 
                  className="w-full h-full object-cover"
                />
             </div>
             <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-tight">{viewingClient.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-500">
                   <span className="text-xs font-bold tracking-wider">{viewingClient.phone}</span>
                   <div className="hidden sm:block w-1 h-1 rounded-full bg-zinc-800" />
                   <span className="text-[10px] font-medium uppercase tracking-widest opacity-40">Membro desde {new Date(viewingClient.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
             </div>
          </section>

          {/* Stats Grid */}
          <section className="grid grid-cols-2 gap-4">
             <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-2xl space-y-2">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Investimento Total</p>
                <div className="flex items-baseline gap-1.5">
                   <span className="text-xs font-bold text-[#D4AF37] opacity-60">R$</span>
                   <p className="text-3xl font-black text-[#D4AF37] tracking-tighter">{totalSpent.toFixed(0)}</p>
                </div>
             </div>
             <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-2xl space-y-2">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Número de Visitas</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-3xl font-black text-white tracking-tighter">{clientHistory.length}</p>
                   <p className="text-[10px] font-bold text-zinc-700 uppercase">Cortes</p>
                </div>
             </div>
          </section>

          {/* Actions Section */}
          <section className="bg-neutral-900/50 border border-white/5 p-6 rounded-2xl space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => handleSendMessage()} className="h-14 rounded-xl bg-white text-black font-black text-[11px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-3">
                   <ExternalLink size={16} /> WhatsApp
                </button>
                <button 
                  onClick={() => {
                    const target = viewingClient;
                    const message = `Olá ${target.name}, tudo bem? Sentimos sua falta aqui na Black Diamond! Quando quiser renovar o visual, é só avisar.`;
                    window.open(`https://wa.me/55${target.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  className="h-14 rounded-xl border border-white/10 text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white/5 transition-all flex items-center justify-center gap-3"
                >
                   <Smartphone size={16} className="text-[#C5A059]" /> Notificar
                </button>
             </div>
             <button onClick={() => handleDeleteClient(viewingClient.id)} className="w-full py-2 text-red-500/60 hover:text-red-500 transition-all text-[9px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-2">
                <Trash2 size={12} /> Excluir Registro
             </button>
          </section>

          {/* History Section */}
          <section className="space-y-4">
             <div className="flex items-center gap-3 px-2">
                <History size={14} className="text-zinc-600" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Histórico Recente</h3>
             </div>
             <div className="space-y-3">
                {clientHistory.length > 0 ? clientHistory.map((b, i) => (
                  <div key={i} className="bg-neutral-900/30 border border-white/5 p-5 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                       <span className="text-xl font-black text-zinc-800 group-hover:text-zinc-700 transition-colors">{(clientHistory.length - i).toString().padStart(2, '0')}</span>
                       <div>
                          <p className="text-sm font-bold text-white uppercase tracking-tight">Corte Black Diamond</p>
                          <div className="flex items-center gap-3 mt-1 opacity-50">
                             <p className="text-[10px] font-bold text-zinc-400">{new Date(b.booking_date).toLocaleDateString('pt-BR')}</p>
                             <div className="w-1 h-1 rounded-full bg-zinc-700" />
                             <p className="text-[10px] font-bold text-zinc-400">{b.booking_time.slice(0, 5)}</p>
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-[#D4AF37]">R$ {Number(b.total_price).toFixed(0)}</p>
                    </div>
                  </div>
                )) : <p className="text-xs text-zinc-700 italic px-2">Nenhum registro encontrado.</p>}
             </div>
          </section>
        </main>
      </motion.div>
    );
  }

  if (viewingBooking) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-10 font-sans selection:bg-[#C5A059]/30 flex flex-col items-center"
      >
        <div className="max-w-2xl w-full">
          <header className="flex items-center justify-between mb-8 md:mb-12">
            <button onClick={() => { setViewingBooking(null); setIsRescheduling(false); }} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all group">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Gestão de Agendamento</span>
          </header>

          {!isRescheduling ? (
            <main className="space-y-6 w-full">
               {/* Client Info Card */}
               <section className="bg-neutral-900/50 border border-white/5 p-6 md:p-8 rounded-2xl space-y-4">
                  <div className="space-y-1">
                     <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.5em] ml-0.5">Cliente Agendado</span>
                     <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase leading-tight">{viewingBooking.clients?.name}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 pt-2 text-zinc-500 border-t border-white/5 mt-4 pt-4">
                     <div className="flex items-center gap-3">
                        <Smartphone size={14} className="text-zinc-600" />
                        <span className="text-sm font-bold tracking-widest">{viewingBooking.clients?.phone}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <Calendar size={14} className="text-zinc-600" />
                        <span className="text-sm font-bold tracking-widest">{new Date(viewingBooking.booking_date).toLocaleDateString('pt-BR')}</span>
                     </div>
                  </div>
               </section>

               {/* Time Card: Dominant but Grouped */}
               <section className="bg-neutral-900/80 border border-white/10 p-8 md:p-12 rounded-2xl flex flex-col items-center justify-center space-y-4 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#C5A059]/20" />
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.6em]">Início às</p>
                  <p className="text-6xl md:text-7xl font-black text-white tracking-tighter leading-none">{viewingBooking.booking_time.slice(0, 5)}</p>
               </section>

               {/* Details Grid */}
               <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-2xl space-y-1">
                     <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Serviço</p>
                     <p className="text-sm font-black text-white uppercase italic">Corte Black Diamond</p>
                  </div>
                  <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-2xl space-y-1 text-right sm:text-left">
                     <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Valor</p>
                     <div className="flex items-baseline justify-end sm:justify-start gap-1">
                        <span className="text-[10px] font-bold text-[#D4AF37] opacity-60 uppercase">R$</span>
                        <p className="text-xl font-black text-[#D4AF37]">{Number(viewingBooking.total_price).toFixed(0)}</p>
                     </div>
                  </div>
               </section>

               {/* Action Buttons */}
               <section className="pt-6 space-y-3">
                  <button onClick={() => { setRescheduleData({ date: viewingBooking.booking_date, time: viewingBooking.booking_time.slice(0, 5) }); setIsRescheduling(true); }} className="w-full h-14 rounded-xl bg-white text-black font-black text-[11px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all flex items-center justify-center shadow-xl active:scale-[0.98]">
                     Reagendar Horário
                  </button>
                  <button onClick={() => handleUpdateStatus(viewingBooking.id, 'cancelled')} className="w-full h-14 rounded-xl border border-red-500/20 text-red-500 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-red-500/5 transition-all flex items-center justify-center gap-2">
                     <Trash2 size={14} /> Cancelar Atendimento
                  </button>
               </section>
            </main>
          ) : (
            <div className="w-full space-y-8">
               <div className="flex items-center gap-6">
                  <button onClick={() => setIsRescheduling(false)} className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all"><ArrowLeft size={20} /></button>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Nova Janela</h2>
               </div>
               <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] ml-1">Selecione a Data</label>
                    <input type="date" value={rescheduleData.date} onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})} className="w-full bg-neutral-900 border border-white/10 text-white p-5 rounded-xl outline-none focus:border-[#C5A059] transition-all text-sm font-black uppercase tracking-widest shadow-inner" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] ml-1">Escolha o Horário</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {timeSlots.map(t => (
                        <button key={t} onClick={() => setRescheduleData({...rescheduleData, time: t})} className={`py-4 text-[10px] font-black border rounded-xl transition-all ${rescheduleData.time === t ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059] shadow-lg shadow-[#C5A059]/10' : 'border-white/5 bg-neutral-900/50 text-zinc-600 hover:border-white/20'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-6">
                    <button onClick={handleReschedule} className="w-full h-16 rounded-xl bg-[#C5A059] text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-[#F5E0A3] transition-all shadow-xl active:scale-[0.98]">Confirmar Reagendamento</button>
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
        <header className="max-w-4xl mx-auto flex items-center justify-between mb-12">
          <button onClick={() => setIsCreatingBooking(false)} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all shadow-xl"><ChevronLeft size={20} /></button>
          <h1 className="text-xl font-black uppercase tracking-[0.2em] italic text-[#C5A059]">Elite Booking</h1>
        </header>
        <main className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-10">
            <section className="space-y-5">
              <h3 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] flex items-center gap-3 px-1">
                 <div className="w-6 h-6 rounded-lg bg-[#C5A059]/10 flex items-center justify-center border border-[#C5A059]/20">
                    <User size={12} className="text-[#C5A059]" />
                 </div>
                 Informações do Cliente
              </h3>
              <div className="space-y-3">
                <input type="text" placeholder="NOME DO CLIENTE" className="w-full bg-neutral-900 border border-white/10 rounded-xl h-14 px-6 outline-none focus:border-[#C5A059] transition-all text-xs font-black uppercase tracking-widest placeholder:text-zinc-800" />
                <input type="tel" placeholder="NÚMERO WHATSAPP" className="w-full bg-neutral-900 border border-white/10 rounded-xl h-14 px-6 outline-none focus:border-[#C5A059] transition-all text-xs font-black uppercase tracking-widest placeholder:text-zinc-800" />
              </div>
            </section>
            <section className="space-y-5">
              <h3 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] flex items-center gap-3 px-1">
                 <div className="w-6 h-6 rounded-lg bg-[#C5A059]/10 flex items-center justify-center border border-[#C5A059]/20">
                    <Scissors size={12} className="text-[#C5A059]" />
                 </div>
                 Serviços Selecionados
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {services.map((s) => (
                  <button key={s.id} className="group flex items-center justify-between p-5 bg-neutral-900/50 border border-white/5 rounded-xl hover:border-[#C5A059]/30 transition-all duration-300">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-white transition-colors">{s.name}</span>
                    <span className="text-[11px] font-black text-[#C5A059] italic">R$ {Number(s.price).toFixed(0)}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="space-y-10">
            <section className="space-y-5">
              <h3 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] flex items-center gap-3 px-1">
                 <div className="w-6 h-6 rounded-lg bg-[#C5A059]/10 flex items-center justify-center border border-[#C5A059]/20">
                    <Calendar size={12} className="text-[#C5A059]" />
                 </div>
                 Agenda e Horário
              </h3>
              <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl space-y-6 shadow-2xl">
                <input type="date" className="w-full bg-black/50 border border-white/5 rounded-xl py-4 px-6 outline-none text-[11px] font-black uppercase tracking-widest focus:border-[#C5A059] shadow-inner text-white" />
                <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-3 custom-scrollbar">
                  {timeSlots.map(t => <button key={t} className="py-4 text-[10px] font-black border border-white/5 rounded-xl bg-white/[0.01] hover:bg-[#C5A059] hover:text-black transition-all uppercase">{t}</button>)}
                </div>
              </div>
            </section>
            <button onClick={handleCreateBooking} className="w-full h-16 rounded-xl bg-[#C5A059] text-black font-black uppercase tracking-[0.3em] text-xs hover:bg-[#F5E0A3] transition-all shadow-xl active:scale-[0.97]">EFETUAR AGENDAMENTO</button>
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

          <div className="mt-auto p-8 border-t border-white/5 flex flex-col gap-4">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl text-zinc-700 hover:text-red-400 hover:bg-red-500/5 transition-all text-[9px] font-black uppercase tracking-[0.4em]"
            >
              <LogOut size={16} />
              Sair do Sistema
            </button>
            <p className="text-center text-[7px] text-zinc-900 font-black tracking-widest uppercase">System Version 1.2.1 | Elite</p>
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
