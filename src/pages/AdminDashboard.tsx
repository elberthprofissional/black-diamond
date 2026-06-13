// AdminDashboard - Elite Version 2.0 - Final Build
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

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('agenda');
  const [bookings, setBookings] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<any | null>(null);
  const [viewingClient, setViewingClient] = useState<any | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
  
  const [selectedWeeklyDate, setSelectedWeeklyDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsData, clientsData, servicesData] = await Promise.all([
        getBookings(),
        getClients(),
        getServices()
      ]);
      setBookings(bookingsData || []);
      setClients(clientsData || []);
      setServices(servicesData || []);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao carregar dados do banco.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
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
      fetchData();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao atualizar agendamento.', type: 'error' });
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time) return;
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_date: rescheduleData.date, 
          booking_time: rescheduleData.time,
          status: 'pending' 
        })
        .eq('id', viewingBooking.id);
      
      if (error) throw error;
      
      setToast({ message: 'Reagendamento concluído!', type: 'success' });
      setIsRescheduling(false);
      setViewingBooking(null);
      fetchData();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao reagendar.', type: 'error' });
    }
  };

  const handleSendMessage = (client?: any) => {
    const target = client || viewingBooking?.clients || viewingClient;
    if (!target?.phone) return;
    const message = `Olá ${target.name}, aqui é da Black Diamond!`;
    window.open(`https://wa.me/55${target.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este cliente?')) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setToast({ message: 'Cliente removido.', type: 'success' });
      setViewingClient(null);
      fetchData();
    } catch (error) {
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
        className="min-h-screen bg-[#0A0A0A] text-white p-6 lg:p-20 selection:bg-gold-600/30 font-sans"
      >
        <header className="max-w-6xl mx-auto flex items-center justify-between mb-24">
          <button onClick={() => setViewingClient(null)} className="flex items-center gap-3 text-zinc-600 hover:text-white transition-all uppercase text-[9px] font-black tracking-[0.4em] group">
            <ArrowLeft size={14} className="group-hover:-translate-x-2 transition-transform" />
            Voltar para Clientes
          </button>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-800">Intelligence System</span>
          </div>
        </header>

        <main className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-32">
            <div className="space-y-24">
              <div className="space-y-8">
                <div className="flex items-center gap-8">
                   <div className="w-24 h-24 rounded-full border-2 border-white/5 overflow-hidden shadow-2xl">
                      <img 
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(viewingClient.name)}&backgroundColor=0a0a0a&fontFamily=serif&fontSize=40`} 
                        alt={viewingClient.name} 
                        className="w-full h-full object-cover"
                      />
                   </div>
                   <div className="space-y-2">
                     <span className="text-[10px] font-black text-[#C5A059] uppercase tracking-[0.6em] mb-4 block">Perfil do Cliente</span>
                     <h2 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none">{viewingClient.name}</h2>
                   </div>
                </div>
                <div className="flex items-center gap-10 pt-4">
                   <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Contato Direto</span>
                      <span className="text-lg font-bold text-zinc-300 tracking-widest">{viewingClient.phone}</span>
                   </div>
                   <div className="w-px h-10 bg-white/5" />
                   <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Membro desde</span>
                      <span className="text-lg font-bold text-zinc-300 tracking-widest">{new Date(viewingClient.created_at).toLocaleDateString('pt-BR')}</span>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                 <div className="space-y-4">
                   <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Frequência Total</p>
                   <div className="flex items-baseline gap-4">
                      <p className="text-7xl font-black text-white tracking-tighter">{clientHistory.length}</p>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cortes Realizados</p>
                   </div>
                 </div>
                 <div className="space-y-4">
                   <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">LTV / Valor Gerado</p>
                   <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-[#C5A059] opacity-40">R$</span>
                      <p className="text-7xl font-black text-[#C5A059] tracking-tighter">{totalSpent.toFixed(0)}</p>
                   </div>
                 </div>
              </div>

              <div className="space-y-12 pt-10">
                 <div className="flex items-center justify-between border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                       <History size={18} className="text-[#C5A059]" />
                       <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-white">Histórico de Atendimentos</h3>
                    </div>
                 </div>
                 <div className="space-y-1">
                    {clientHistory.length > 0 ? clientHistory.map((b, i) => (
                      <div key={i} className="py-8 flex items-center justify-between group border-b border-white/[0.03] hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-10">
                           <span className="text-2xl font-black text-zinc-800 group-hover:text-zinc-600 transition-colors">{(clientHistory.length - i).toString().padStart(2, '0')}</span>
                           <div>
                              <p className="text-lg font-bold text-white uppercase tracking-tight">Corte Black Diamond</p>
                              <p className="text-xs text-zinc-500 font-medium tracking-wide">{new Date(b.booking_date).toLocaleDateString('pt-BR')} às {b.booking_time.slice(0, 5)}</p>
                           </div>
                        </div>
                        <div className="text-right flex items-center gap-12">
                           <CheckCircle size={18} className="text-emerald-500/30" />
                        </div>
                      </div>
                    )) : <p className="text-sm text-zinc-600 italic">Nenhum serviço registrado.</p>}
                 </div>
              </div>
            </div>

            <div className="space-y-12 sticky top-20 h-fit">
               <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] space-y-10 shadow-2xl">
                  <div className="space-y-4">
                     <button onClick={() => handleSendMessage()} className="w-full bg-white hover:bg-zinc-200 text-black h-20 rounded-3xl font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95">
                       <ExternalLink size={18} /> WhatsApp
                     </button>
                     <button onClick={() => handleDeleteClient(viewingClient.id)} className="w-full bg-transparent border border-white/10 hover:border-red-500/30 hover:text-red-500 text-zinc-600 h-16 rounded-3xl font-bold text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3">
                       <Trash2 size={16} /> Remover Base
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </main>
      </motion.div>
    );
  }

  if (viewingBooking) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0A0A0A] text-white p-6 lg:p-16 selection:bg-gold-600/30 font-sans"
      >
        <header className="max-w-5xl mx-auto flex items-center justify-between mb-20">
          <button onClick={() => { setViewingBooking(null); setIsRescheduling(false); }} className="flex items-center gap-3 text-zinc-600 hover:text-white transition-all uppercase text-[9px] font-black tracking-[0.4em] group">
            <ArrowLeft size={14} className="group-hover:-translate-x-2 transition-transform" />
            Voltar
          </button>
          <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-zinc-700">Management / Booking</span>
        </header>

        <main className="max-w-5xl mx-auto">
          {!isRescheduling ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-20 items-start">
              <div className="space-y-16">
                <div className="space-y-6">
                  <h2 className="font-sans text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">{viewingBooking.clients?.name}</h2>
                  <div className="flex flex-wrap items-center gap-8 text-zinc-500">
                    <button onClick={() => handleSendMessage()} className="flex items-center gap-3 hover:text-emerald-500 transition-colors group">
                      <Smartphone size={16} className="text-zinc-700 group-hover:text-emerald-500" />
                      <span className="text-sm font-bold tracking-widest">{viewingBooking.clients?.phone}</span>
                    </button>
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-zinc-700" />
                      <span className="text-sm font-bold tracking-widest">{new Date(viewingBooking.booking_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="bg-[#0A0A0A] p-10 space-y-4">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Serviço</p>
                    <span className="text-2xl font-bold text-white tracking-tight uppercase">Corte Premium</span>
                  </div>
                  <div className="bg-[#0A0A0A] p-10 space-y-4">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Investimento</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-[#C5A059] opacity-40">R$</span>
                      <span className="text-5xl font-black text-[#C5A059] tracking-tighter">{Number(viewingBooking.total_price).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-zinc-600">
                    <Clock size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Horário Confirmado</span>
                  </div>
                  <p className="text-6xl font-black text-white tracking-tighter">{viewingBooking.booking_time.slice(0, 5)}</p>
                </div>
                <div className="space-y-3">
                   <button onClick={() => { setRescheduleData({ date: viewingBooking.booking_date, time: viewingBooking.booking_time.slice(0, 5) }); setIsRescheduling(true); }} className="w-full bg-white hover:bg-zinc-200 text-black h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95">Reagendar</button>
                   <button onClick={() => handleSendMessage()} className="w-full bg-white/5 hover:bg-white/10 text-white h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all">Entrar em Contato</button>
                   <button onClick={() => handleUpdateStatus(viewingBooking.id, 'cancelled')} className="w-full text-zinc-600 hover:text-red-500 transition-colors py-4 text-[9px] font-bold uppercase tracking-[0.4em]">Cancelar Agendamento</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-12">
               <div className="flex items-center gap-6 mb-12">
                  <button onClick={() => setIsRescheduling(false)} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white transition-all"><ArrowLeft size={20} /></button>
                  <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-widest italic">Novo Horário</h2>
               </div>
               <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] ml-2">Nova Data</label>
                    <input type="date" value={rescheduleData.date} onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})} className="w-full bg-white/[0.03] border border-white/10 text-white p-8 rounded-[1.5rem] outline-none focus:border-[#C5A059] transition-all text-sm font-bold uppercase tracking-widest" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] ml-2">Novo Horário</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {timeSlots.map(t => (
                        <button key={t} onClick={() => setRescheduleData({...rescheduleData, time: t})} className={`py-5 text-xs font-bold border rounded-xl transition-all ${rescheduleData.time === t ? 'border-[#C5A059] bg-[#C5A059]/10 text-white shadow-lg' : 'border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/20'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-8">
                    <button onClick={handleReschedule} className="w-full bg-[#C5A059] text-black h-20 rounded-2xl font-black text-sm uppercase tracking-[0.3em] hover:bg-[#F5E0A3] transition-all shadow-2xl hover:translate-y-[-2px]">Confirmar Reagendamento</button>
                  </div>
               </div>
            </div>
          )}
        </main>
      </motion.div>
    );
  }

  if (isCreatingBooking) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="min-h-screen bg-[#0A0A0A] text-white p-6 lg:p-12 selection:bg-gold-600/30">
        <header className="max-w-4xl mx-auto flex items-center justify-between mb-12">
          <button onClick={() => setIsCreatingBooking(false)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-xs font-bold tracking-widest"><ChevronLeft size={18} />Voltar</button>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Novo Agendamento</h1>
        </header>
        <main className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><User size={14} className="text-[#C5A059]" />Informações</h3>
              <div className="space-y-4">
                <input type="text" placeholder="NOME" className="w-full bg-white/[0.03] border border-white/10 rounded-xl h-14 px-6 outline-none focus:border-[#C5A059] transition-all text-sm font-bold" />
                <input type="tel" placeholder="WHATSAPP" className="w-full bg-white/[0.03] border border-white/10 rounded-xl h-14 px-6 outline-none focus:border-[#C5A059] transition-all text-sm font-bold" />
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Scissors size={14} className="text-[#C5A059]" />Serviço</h3>
              <div className="grid grid-cols-1 gap-2">
                {services.map((s) => (
                  <button key={s.id} className="group flex items-center justify-between py-4 px-6 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/10 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white">{s.name}</span>
                    <span className="text-xs font-bold text-[#C5A059]">R$ {Number(s.price).toFixed(0)}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Calendar size={14} className="text-[#C5A059]" />Data/Hora</h3>
              <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-6 shadow-2xl">
                <input type="date" className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 outline-none text-xs font-bold uppercase focus:border-[#C5A059]" />
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {timeSlots.map(t => <button key={t} className="py-3 text-[10px] font-bold border border-white/10 rounded-xl bg-white/[0.03] hover:bg-[#C5A059] hover:text-black transition-all">{t}</button>)}
                </div>
              </div>
            </section>
            <button onClick={handleCreateBooking} className="w-full bg-[#C5A059] text-black h-16 rounded-xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3">Confirmar</button>
          </div>
        </main>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-400 font-sans selection:bg-gold-600/30 pb-20 lg:pb-0">
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
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/80 backdrop-blur-2xl border-t border-white/5 px-6 py-4 flex items-center justify-around z-50 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-3xl">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1.5 transition-all relative ${isActive ? 'text-[#C5A059]' : 'text-zinc-600'}`}
              >
                <item.icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_rgba(197,160,89,0.5)]' : ''} />
                <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                {isActive && <motion.div layoutId="mobile-indicator" className="absolute -top-4 w-6 h-1 bg-[#C5A059] rounded-full shadow-[0_0_10px_#C5A059]" />}
              </button>
            );
          })}
        </nav>
        <main className="flex-1 min-h-screen lg:px-12 px-6 py-10 overflow-x-hidden">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{activeTab === 'agenda' ? 'Agenda Diária' : activeTab === 'faturamento' ? 'Faturamento' : activeTab === 'clientes' ? 'Meus Clientes' : 'Agenda da Semana'}</h1>
              {activeTab === 'clientes' && <div className="mt-2 inline-block px-3 py-1 bg-white/[0.02] border border-white/5 rounded backdrop-blur-md"><span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest">{clients.length} CLIENTES NO TOTAL</span></div>}
            </div>
            <div className="flex items-center gap-4">
              {activeTab === 'clientes' ? <button className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl font-bold text-xs transition-all uppercase tracking-wide">💬 ENVIAR P/ TODOS</button> : activeTab === 'faturamento' ? null : <button onClick={() => setIsCreatingBooking(true)} className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl font-bold text-xs transition-all uppercase tracking-wide shadow-lg"><Plus size={16} /><span>Novo Corte</span></button>}
            </div>
          </header>
          {loading ? <div className="flex items-center justify-center h-[50vh]"><div className="w-12 h-12 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div></div> : (
            <AnimatePresence mode="wait">
              {activeTab === 'agenda' && (
                <motion.div key="agenda" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
                  <div className="space-y-12">
                    <div className="space-y-6">
                      <h3 className="text-xs font-bold text-[#C5A059] uppercase tracking-[0.2em]">Próximo Corte</h3>
                      {nextBooking ? (
                        <div className="bg-white/[0.03] border-y border-r border-white/5 border-l-4 border-l-[#C5A059] shadow-lg rounded-xl p-6 flex items-center justify-between transition-all">
                          <div className="flex items-center gap-8">
                            <span className="text-4xl font-extrabold text-[#C5A059] tracking-tighter">{nextBooking.time}</span>
                            <div className="h-10 w-[1px] bg-white/10" />
                            <div><p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cliente</p><p className="text-xl font-bold text-white uppercase tracking-tight">{nextBooking.booking?.clients?.name}</p></div>
                          </div>
                          <div className="text-right"><p className="text-[10px] font-bold text-[#C5A059] uppercase bg-[#C5A059]/20 px-3 py-1 rounded-full">Confirmado</p></div>
                        </div>
                      ) : <div className="flex flex-col items-center justify-center py-12"><p className="text-sm text-neutral-500 italic font-medium">Nenhum corte agendado.</p></div>}
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Horários Ocupados</h3>
                      {occupiedSlots.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {occupiedSlots.map((slot, i) => (
                            <div key={i} onClick={() => setViewingBooking(slot.booking)} className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all hover:bg-white/[0.04] cursor-pointer group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                  <span className="text-xl font-bold text-white group-hover:text-[#C5A059] transition-colors">{slot.time}</span>
                                  <div className="w-[1px] h-5 bg-[#C5A059]/30" />
                                  <span className="text-sm font-bold text-zinc-300 uppercase tracking-tight truncate">{slot.booking?.clients?.name}</span>
                                </div>
                                <ChevronLeft size={14} className="rotate-180 text-zinc-600 group-hover:text-[#C5A059]" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <div className="flex flex-col items-center justify-center py-12 border border-white/5 rounded-2xl border-dashed"><p className="text-sm text-neutral-500 italic">Nenhum agendamento ocupado.</p></div>}
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Horários Disponíveis</h3><span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span></div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                        {timeSlots.filter(time => !todayBookings.some(b => b.booking_time.slice(0, 5) === time)).map((time) => (
                          <div key={time} onClick={() => setIsCreatingBooking(true)} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-white/10 hover:border-[#C5A059]/50 cursor-pointer transition-colors group">
                            <span className="text-lg font-bold text-white group-hover:text-[#C5A059] transition-colors">{time}</span>
                            <span className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">Livre</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6 hidden lg:block">
                    <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md shadow-2xl rounded-2xl p-8 transition-all hover:bg-white/[0.04] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-[#D4AF37]/10" />
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest block mb-6">Lucro de Hoje</span>
                      <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-[#D4AF37] opacity-40">R$</span><span className="text-5xl font-black text-[#D4AF37] tracking-tighter drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]">{todayRevenue.toFixed(0)}</span></div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md shadow-2xl rounded-2xl p-8 relative overflow-hidden group"><div className="flex flex-col"><span className="text-5xl font-black text-white tracking-tighter leading-none">{availableSlots}</span><span className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em] mt-2">Vagas Livres</span></div></div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'semanal' && (
                <motion.div key="semanal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                  <div className="flex flex-wrap gap-3 pb-10 border-b border-white/5">
                    {weekDays.map((day, i) => (
                      <button key={i} onClick={() => setSelectedWeeklyDate(day.full)} className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border transition-all duration-300 ${selectedWeeklyDate === day.full ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' : 'border-white/5 bg-white/[0.02] text-zinc-600 hover:border-white/20'}`}><span className="text-[8px] font-bold uppercase mb-1 tracking-widest">{day.short}</span><span className="text-lg font-black">{day.num}</span></button>
                    ))}
                  </div>
                  <div className="space-y-8">
                     <h3 className="text-xs font-bold text-[#C5A059] uppercase tracking-[0.2em]">Agendamentos para {new Date(selectedWeeklyDate + 'T12:00:00').toLocaleDateString('pt-BR')}</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bookings.filter(b => b.booking_date === selectedWeeklyDate).length > 0 ? bookings.filter(b => b.booking_date === selectedWeeklyDate).map((b, i) => (
                          <div key={i} onClick={() => setViewingBooking(b)} className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all hover:bg-white/[0.04] cursor-pointer group"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><span className="text-xl font-bold text-white">{b.booking_time.slice(0, 5)}</span><div className="w-px h-4 bg-white/10" /><span className="text-sm font-bold text-zinc-300 uppercase truncate max-w-[120px]">{b.clients?.name}</span></div><ChevronRight size={16} className="text-zinc-600 group-hover:text-[#C5A059] transition-colors" /></div></div>
                        )) : <div className="col-span-full flex flex-col items-center justify-center py-20"><CalendarDays size={64} className="text-white/[0.03] mb-4" /><p className="text-sm text-neutral-500 italic">Nenhum agendamento.</p></div>}
                     </div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'faturamento' && (
                <motion.div key="faturamento" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                  <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
                    <div className="flex gap-2 bg-white/[0.03] p-1 rounded-xl border border-white/5 backdrop-blur-md">
                      <button onClick={() => setViewMode('semanal')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'semanal' ? 'bg-[#C5A059] text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Semanal</button>
                      <button onClick={() => setViewMode('mensal')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'mensal' ? 'bg-[#C5A059] text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Mensal</button>
                    </div>
                  </div>
                  {viewMode === 'semanal' ? (
                    <div className="space-y-12">
                      <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 backdrop-blur-md p-16 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6"><div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center"><DollarSign size={16} className="text-zinc-400" /></div><span className="text-[10px] text-zinc-500 font-bold tracking-[0.4em] uppercase opacity-60">Lucro da Semana</span></div>
                        <div className="flex items-baseline gap-4"><span className="text-4xl font-bold text-[#D4AF37] opacity-40">R$</span><h2 className="text-6xl font-black text-[#D4AF37] tracking-tighter leading-none drop-shadow-md">{weeklyRevenue.toFixed(0)}</h2></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[{ label: 'Cancelamentos', value: weeklyBookings.filter(b => b.status === 'cancelled').length.toString(), icon: Scissors }, { label: 'Novos Clientes', value: clients.length.toString(), icon: Users }, { label: 'Atendimentos Realizados', value: weeklyBookings.length.toString(), icon: CheckCircle }].map((stat, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all hover:bg-white/[0.05] group relative flex flex-col justify-between h-36">
                            <div className="flex justify-between items-start"><p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">{stat.label}</p><stat.icon size={18} className="text-zinc-500 opacity-60" /></div>
                            <p className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-12">
                      <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 backdrop-blur-md p-16 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6"><div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center"><DollarSign size={16} className="text-zinc-400" /></div><span className="text-[10px] text-zinc-500 font-bold tracking-[0.4em] uppercase opacity-60">Lucro do Mês</span></div>
                        <div className="flex items-baseline gap-4"><span className="text-4xl font-bold text-[#D4AF37] opacity-40">R$</span><h2 className="text-6xl font-black text-[#D4AF37] tracking-tighter leading-none drop-shadow-md">{monthlyRevenue.toFixed(0)}</h2></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-8 rounded-2xl shadow-xl flex flex-col justify-center min-h-[160px] relative group overflow-hidden transition-all hover:bg-white/[0.04]"><p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-4">Cancelamentos no Mês</p><p className="text-5xl font-black text-white tracking-tighter">{monthlyBookings.filter(b => b.status === 'cancelled').length.toString()}</p><div className="w-10 h-1 bg-red-500/20 mt-6 rounded-full" /><Scissors size={24} className="absolute top-6 right-6 text-zinc-600/20" /></div>
                        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-8 rounded-2xl shadow-xl flex flex-col justify-center min-h-[160px] relative group overflow-hidden transition-all hover:bg-white/[0.04]"><p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-4">Novos Clientes no Mês</p><p className="text-5xl font-black text-[#D4AF37] tracking-tighter">{clients.length}</p><div className="w-10 h-1 bg-[#D4AF37]/20 mt-6 rounded-full" /><Users size={24} className="absolute top-6 right-6 text-zinc-600/20" /></div>
                        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-8 rounded-2xl shadow-xl flex flex-col justify-center min-h-[160px] relative group overflow-hidden transition-all hover:bg-white/[0.04]"><p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-4">Atendimentos no Mês</p><p className="text-5xl font-black text-white tracking-tighter">{monthlyBookings.length}</p><div className="w-10 h-1 bg-white/10 mt-6 rounded-full" /><CheckCircle size={24} className="absolute top-6 right-6 text-zinc-600/20" /></div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
              {activeTab === 'clientes' && (
                <motion.div key="clientes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                  <div className="w-full max-w-2xl mx-auto space-y-12 py-6">
                    <div className="relative group"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#C5A059] transition-colors" size={20} /><input type="text" placeholder="Pesquisar por nome ou WhatsApp..." className="w-full bg-white/[0.03] border border-white/10 rounded-xl h-16 pl-16 pr-6 outline-none text-sm text-white focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all placeholder:text-zinc-700 italic shadow-xl" /></div>
                    <div className="grid grid-cols-1 gap-4">
                      {clients.length > 0 ? clients.map((client) => (
                        <div key={client.id} onClick={() => setViewingClient(client)} className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-6 rounded-2xl flex items-center justify-between hover:bg-white/5 hover:border-white/10 transition-colors group cursor-pointer">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border border-white/10 overflow-hidden group-hover:border-[#C5A059]/30 transition-all">
                               <img 
                                 src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(client.name)}&backgroundColor=0a0a0a&fontFamily=serif&fontSize=40`} 
                                 alt={client.name} 
                                 className="w-full h-full object-cover opacity-80"
                               />
                            </div>
                            <div><p className="text-white font-bold uppercase tracking-tight">{client.name}</p><p className="text-xs text-zinc-500 font-medium">{client.phone}</p></div></div>
                          <div className="flex items-center gap-8"><div className="text-right hidden sm:block"><p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">Cadastrado em</p><p className="text-xs text-zinc-400">{new Date(client.created_at).toLocaleDateString('pt-BR')}</p></div><ChevronRight size={18} className="text-neutral-500 group-hover:text-[#C5A059] transition-colors" /></div>
                        </div>
                      )) : <div className="flex flex-col items-center justify-center py-12"><p className="text-sm text-neutral-500 italic font-medium tracking-wide">Nenhum cliente encontrado.</p></div>}
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
