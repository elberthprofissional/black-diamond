// AdminDashboard - Elite Version 3.2 - Final Desktop Harmony & Humanized CRM
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
  ExternalLink,
  X
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
  const [showFullHistory, setShowFullHistory] = useState(false);
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
        className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-12 lg:p-24 font-sans selection:bg-[#C5A059]/30 flex flex-col items-center"
      >
        <AnimatePresence>
          {showFullHistory && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl p-4 md:p-20 flex items-center justify-center overflow-y-auto"
            >
              <div className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 relative shadow-3xl">
                <button onClick={() => setShowFullHistory(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all"><X size={20} /></button>
                <div className="space-y-8 text-left">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-[#C5A059] uppercase tracking-[0.5em]">Linha do Tempo</span>
                    <h3 className="text-3xl font-black uppercase tracking-tight text-white">Histórico de Atendimentos</h3>
                  </div>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {clientHistory.map((b, i) => (
                      <div key={i} className="p-6 bg-black/40 border border-white/5 rounded-2xl flex justify-between items-center group hover:border-[#C5A059]/30 transition-all">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white uppercase tracking-tight">Corte Black Diamond</p>
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{new Date(b.booking_date).toLocaleDateString('pt-BR')} às {b.booking_time.slice(0, 5)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-[#C5A059]">R$ {Number(b.total_price).toFixed(0)}</p>
                          <div className="flex items-center justify-end gap-1 mt-1"><CheckCircle size={10} className="text-emerald-500" /><span className="text-[8px] font-bold text-zinc-700 uppercase">Pago</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-6xl">
          <header className="flex items-center justify-between mb-8 md:mb-16">
            <button onClick={() => setViewingClient(null)} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all group shadow-xl">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
               <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">Perfil do Cliente</span>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 md:gap-16">
            <main className="space-y-8">
              {/* Client Intro Card */}
              <section className="bg-neutral-900/50 border border-white/5 p-8 md:p-12 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10 text-center md:text-left shadow-2xl backdrop-blur-xl text-left">
                 <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-black border border-white/10 overflow-hidden shadow-3xl relative group">
                    <img 
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(viewingClient.name)}&backgroundColor=0a0a0a&fontFamily=serif&fontSize=40`} 
                      alt={viewingClient.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                 </div>
                 <div className="space-y-4 flex-1 text-left">
                    <div className="space-y-1 text-left">
                       <span className="text-[10px] font-black text-[#C5A059] uppercase tracking-[0.5em] opacity-60">Cliente Premium</span>
                       <h2 className="text-3xl md:text-6xl font-black text-white tracking-tighter uppercase leading-[0.85] break-words text-left">{viewingClient.name}</h2>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 text-zinc-500 text-left">
                       <div className="flex items-center gap-2 text-left">
                          <Smartphone size={14} className="text-emerald-500/50" />
                          <span className="text-sm font-bold tracking-widest">{viewingClient.phone}</span>
                       </div>
                       <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-zinc-800" />
                       <span className="text-[10px] font-bold uppercase tracking-widest italic opacity-30 text-left">Membro desde {new Date(viewingClient.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                 </div>
              </section>

              {/* Stats & Finance */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 text-left">
                 <div className="bg-neutral-900/50 border border-[#C5A059]/20 p-10 md:p-12 rounded-[2.5rem] space-y-4 shadow-2xl relative overflow-hidden group text-left">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] mb-4 text-left">Valor Gerado</p>
                    <div className="flex items-baseline gap-3 relative z-10 text-left">
                       <span className="text-2xl font-bold text-[#D4AF37] opacity-60 text-left">R$</span>
                       <p className="text-5xl md:text-7xl font-black text-[#D4AF37] tracking-tighter leading-none drop-shadow-2xl text-left">{totalSpent.toFixed(0)}</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => setShowFullHistory(true)}
                  className="bg-neutral-900/50 border border-white/5 p-10 md:p-12 rounded-[2.5rem] space-y-4 shadow-2xl hover:border-[#C5A059]/40 transition-all text-left relative group overflow-hidden"
                 >
                    <div className="absolute top-6 right-8 text-zinc-800 group-hover:text-[#C5A059] transition-all transform group-hover:translate-x-1 text-left"><ChevronRight size={32} /></div>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] mb-4 text-left">Visitas Efetuadas</p>
                    <div className="flex items-baseline gap-5 text-left">
                       <p className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none text-left">{clientHistory.length}</p>
                       <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest border-b border-[#C5A059]/30 pb-0.5 group-hover:text-[#C5A059] transition-colors text-left">Ver Histórico</p>
                    </div>
                 </button>
              </section>
            </main>

            {/* Action Sidebar */}
            <aside className="space-y-6 self-start lg:sticky lg:top-32 text-left">
               <div className="bg-[#0D0D0D]/80 border border-white/10 p-10 md:p-12 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] backdrop-blur-3xl relative overflow-hidden text-left">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent opacity-50 text-left" />
                  <p className="text-[11px] font-black text-zinc-800 uppercase tracking-[0.8em] text-center mb-12">Gestão CRM</p>
                  <div className="space-y-4 text-left">
                     <button onClick={() => handleSendMessage()} className="w-full h-20 rounded-2xl bg-white text-black font-black text-[13px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-[0.98] group/btn text-left">
                        <ExternalLink size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" /> WhatsApp
                     </button>
                     <button 
                       onClick={() => {
                         const target = viewingClient;
                         const message = `Olá ${target.name}, tudo bem? Sentimos sua falta aqui na Black Diamond! Quando quiser renovar o visual, é só avisar.`;
                         window.open(`https://wa.me/55${target.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                       }}
                       className="w-full h-18 rounded-2xl border border-white/10 text-white font-black text-[11px] uppercase tracking-[0.3em] hover:bg-white/5 transition-all flex items-center justify-center gap-5 group/btn text-left"
                     >
                        <Smartphone size={18} className="text-[#C5A059] group-hover/btn:scale-110 transition-transform" /> Notificar
                     </button>
                  </div>
                  <div className="mt-20 pt-10 border-t border-white/5 text-left">
                     <button onClick={() => handleDeleteClient(viewingClient.id)} className="w-full py-4 text-zinc-900 hover:text-red-500 transition-all text-[10px] font-black uppercase tracking-[0.6em] flex items-center justify-center gap-3 opacity-30 hover:opacity-100 text-left">
                        <Trash2 size={14} /> Excluir Registro
                     </button>
                  </div>
               </div>
            </aside>
          </div>
        </div>
      </motion.div>
    );
  }

  if (viewingBooking) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-12 lg:p-24 font-sans selection:bg-[#C5A059]/30 flex flex-col items-center justify-center"
      >
        <div className="max-w-6xl w-full text-left">
          <header className="flex items-center justify-between mb-12 md:mb-20 text-left">
            <button onClick={() => { setViewingBooking(null); setIsRescheduling(false); }} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all group shadow-xl">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="px-8 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl text-left">
               <span className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-500 text-left">Gestão de Agendamento</span>
            </div>
          </header>

          {!isRescheduling ? (
            <main className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 md:gap-12 items-stretch text-left">
               {/* Insight Card */}
               <section className="bg-neutral-900/50 border border-white/5 p-10 md:p-20 rounded-[3rem] space-y-12 shadow-3xl relative overflow-hidden group backdrop-blur-xl text-left">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C5A059]/30 to-transparent text-left" />
                  <div className="space-y-6 text-left">
                     <span className="text-[10px] font-black text-[#C5A059] uppercase tracking-[0.8em] ml-1 opacity-60 text-left">Status: Agendado</span>
                     <h2 className="text-4xl md:text-[6rem] font-black text-white tracking-tighter uppercase leading-[0.8] break-words drop-shadow-2xl text-left">{viewingBooking.clients?.name}</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-left">
                    <div className="p-8 bg-black/60 border border-white/5 rounded-3xl flex flex-col justify-between group/card hover:border-[#C5A059]/20 transition-all text-left">
                       <Smartphone size={20} className="text-zinc-700 mb-6 group-hover/card:text-emerald-500 transition-colors" />
                       <span className="text-lg md:text-xl font-black tracking-widest text-white leading-none text-left">{viewingBooking.clients?.phone}</span>
                       <p className="text-[9px] font-black text-zinc-800 uppercase tracking-widest mt-3 text-left">WhatsApp</p>
                    </div>
                    <div className="p-8 bg-black/60 border border-white/5 rounded-3xl flex flex-col justify-between group/card hover:border-[#C5A059]/20 transition-all text-left">
                       <Calendar size={20} className="text-zinc-700 mb-6 group-hover/card:text-[#C5A059] transition-colors" />
                       <span className="text-lg md:text-xl font-black tracking-widest text-white uppercase leading-none text-left">{new Date(viewingBooking.booking_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                       <p className="text-[9px] font-black text-zinc-800 uppercase tracking-widest mt-3 text-left">Data Marcada</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-white/5 pt-10 text-left">
                     <div className="space-y-1 text-left">
                        <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest text-left">Serviço Black Diamond</p>
                        <p className="text-xl font-black text-white italic uppercase tracking-tighter leading-none text-left">Corte Elite</p>
                     </div>
                     <div className="text-right text-left">
                        <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest text-left">Total Faturado</p>
                        <div className="flex items-baseline gap-2 justify-end text-left">
                           <span className="text-xl font-bold text-[#D4AF37] opacity-40 italic leading-none text-left">R$</span>
                           <p className="text-4xl font-black text-[#D4AF37] leading-none text-left">{Number(viewingBooking.total_price).toFixed(0)}</p>
                        </div>
                     </div>
                  </div>
               </section>

               {/* Time Card */}
               <section className="bg-[#0D0D0D] border border-white/10 p-12 rounded-[3rem] flex flex-col items-center justify-between shadow-3xl relative overflow-hidden group text-left">
                  <div className="flex flex-col items-center justify-center flex-1 space-y-4 text-left">
                     <p className="text-[10px] font-black text-zinc-800 uppercase tracking-[1em] group-hover:text-[#C5A059] transition-colors ml-4 text-left">START TIME</p>
                     <p className="text-[8rem] md:text-[10rem] font-black text-white tracking-tighter leading-none drop-shadow-[0_0_50px_rgba(255,255,255,0.08)] group-hover:scale-105 transition-transform duration-1000 text-left">{viewingBooking.booking_time.slice(0, 5)}</p>
                  </div>
                  
                  <div className="w-full space-y-4 mt-12 text-left">
                     <button onClick={() => { setRescheduleData({ date: viewingBooking.booking_date, time: viewingBooking.booking_time.slice(0, 5) }); setIsRescheduling(true); }} className="w-full h-24 rounded-3xl bg-white text-black font-black text-[14px] uppercase tracking-[0.4em] hover:bg-zinc-200 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-[0.98] text-left">
                        REAGENDAR
                     </button>
                     <button onClick={() => handleUpdateStatus(viewingBooking.id, 'cancelled')} className="w-full py-5 text-zinc-900 hover:text-red-500 transition-all text-[11px] font-black uppercase tracking-[0.6em] flex items-center justify-center gap-3 opacity-50 hover:opacity-100 text-left">
                        <Trash2 size={16} /> CANCELAR CORTE
                     </button>
                  </div>
               </section>
            </main>
          ) : (
            <div className="max-w-xl mx-auto space-y-12 w-full text-left">
               <div className="flex items-center gap-8 mb-12 text-left">
                  <button onClick={() => setIsRescheduling(false)} className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all shadow-xl text-left"><ArrowLeft size={24} /></button>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tight italic leading-none text-left">NOVA JANELA</h2>
               </div>
               <div className="space-y-10 bg-neutral-900/50 p-10 rounded-[3rem] border border-white/5 text-left">
                  <div className="space-y-4 text-left">
                    <label className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.8em] ml-2 text-left">DATA DO SERVIÇO</label>
                    <input type="date" value={rescheduleData.date} onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white p-8 rounded-3xl outline-none focus:border-[#C5A059] transition-all text-lg font-black uppercase tracking-widest shadow-inner text-left" />
                  </div>
                  <div className="space-y-6 text-left text-left">
                    <label className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.8em] ml-2 text-left">JANELA DISPONÍVEL</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 text-left">
                      {timeSlots.map(t => (
                        <button key={t} onClick={() => setRescheduleData({...rescheduleData, time: t})} className={`py-6 text-[13px] font-black border rounded-2xl transition-all duration-500 ${rescheduleData.time === t ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059] shadow-[0_0_30px_rgba(197,160,89,0.3)]' : 'border-white/5 bg-black/40 text-zinc-800 hover:border-white/20'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleReschedule} className="w-full h-24 rounded-3xl bg-[#C5A059] text-black font-black text-[12px] uppercase tracking-[0.5em] hover:bg-[#F5E0A3] transition-all shadow-xl active:scale-[0.98] text-left">CONFIRMAR MUDANÇA</button>
               </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (isCreatingBooking) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-12 selection:bg-[#C5A059]/30 flex flex-col items-center">
        <div className="max-w-6xl w-full text-left">
          <header className="flex items-center justify-between mb-16 text-left">
            <button onClick={() => setIsCreatingBooking(false)} className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all shadow-xl text-left"><ChevronLeft size={20} /></button>
            <h1 className="text-2xl font-black uppercase tracking-[0.4em] italic text-[#C5A059] text-left">Elite Booking</h1>
          </header>
          <main className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-start text-left">
            <div className="space-y-12 text-left">
              <section className="space-y-6 text-left">
                <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.6em] flex items-center gap-4 ml-2 text-left">
                   <User size={14} className="text-[#C5A059]" />
                   Dados do Cliente
                </h3>
                <div className="space-y-4 text-left">
                  <input type="text" placeholder="NOME COMPLETO" className="w-full bg-neutral-900/50 border border-white/5 rounded-3xl h-20 px-10 outline-none focus:border-[#C5A059] transition-all text-sm font-black uppercase tracking-widest placeholder:text-zinc-900 shadow-xl text-left" />
                  <input type="tel" placeholder="WHATSAPP (DDD)" className="w-full bg-neutral-900/50 border border-white/5 rounded-3xl h-20 px-10 outline-none focus:border-[#C5A059] transition-all text-sm font-black uppercase tracking-widest placeholder:text-zinc-900 shadow-xl text-left" />
                </div>
              </section>
              <section className="space-y-6 text-left">
                <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.6em] flex items-center gap-4 ml-2 text-left">
                   <Scissors size={14} className="text-[#C5A059]" />
                   Serviço Especialista
                </h3>
                <div className="grid grid-cols-1 gap-3 text-left">
                  {services.map((s) => (
                    <button key={s.id} className="group flex items-center justify-between p-8 bg-neutral-900/30 border border-white/5 rounded-3xl hover:bg-[#C5A059]/5 hover:border-[#C5A059]/40 transition-all duration-500 shadow-xl text-left">
                      <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-white transition-colors text-left">{s.name}</span>
                      <span className="text-[13px] font-black text-[#C5A059] italic text-left">R$ {Number(s.price).toFixed(0)}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <aside className="space-y-12 text-left">
              <section className="space-y-6 text-left">
                <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.6em] flex items-center gap-4 ml-2 text-left">
                   <Calendar size={14} className="text-[#C5A059]" />
                   Agenda Elite
                </h3>
                <div className="bg-[#0D0D0D] border border-white/10 p-10 rounded-[4rem] space-y-10 shadow-3xl relative overflow-hidden text-left">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-600/20 to-transparent text-left" />
                  <input type="date" className="w-full bg-black/60 border border-white/10 rounded-2xl py-6 px-8 outline-none text-[13px] font-black uppercase tracking-widest focus:border-[#C5A059] shadow-inner text-white text-left" />
                  <div className="grid grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-4 custom-scrollbar text-left">
                    {timeSlots.map(t => <button key={t} className="py-5 text-[12px] font-black border border-white/5 rounded-2xl bg-white/[0.01] hover:bg-[#C5A059] hover:text-black transition-all uppercase shadow-md text-left">{t}</button>)}
                  </div>
                </div>
              </section>
              <button onClick={handleCreateBooking} className="w-full h-24 rounded-[2.5rem] bg-[#C5A059] text-black font-black uppercase tracking-[0.5em] text-[13px] hover:bg-[#F5E0A3] transition-all shadow-3xl active:scale-[0.97] text-left">EFETUAR AGENDAMENTO</button>
            </aside>
          </main>
        </div>
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
      <div className="flex relative z-10 text-left">
        <aside className="w-72 h-screen sticky top-0 bg-[#0A0A0A] border-r border-white/5 flex flex-col hidden lg:flex shadow-2xl text-left">
          <div className="flex-1 py-14 flex flex-col text-left">
            <div className="flex items-center gap-5 mb-20 group cursor-pointer px-10 text-left" onClick={() => navigate('/')}>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-[#C5A059]/30 transition-all shadow-inner text-left">
                <img src="/assets/logo.webp" alt="Black Diamond" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex flex-col text-left">
                <h1 className="text-white font-black text-sm tracking-[0.2em] uppercase leading-none text-left">Black Diamond</h1>
              </div>
            </div>

            <nav className="space-y-2 px-4 text-left">
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
                    <span className="relative z-10 text-[10px] uppercase tracking-[0.3em] font-black text-left">{item.label}</span>
                    {isActive && <div className="absolute right-6 w-1 h-1 rounded-full bg-[#C5A059] shadow-[0_0_10px_#C5A059]" />}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-8 border-t border-white/5 flex flex-col gap-4 text-left">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl text-zinc-700 hover:text-red-400 hover:bg-red-500/5 transition-all text-[9px] font-black uppercase tracking-[0.4em] text-left"
            >
              <LogOut size={16} />
              Sair do Sistema
            </button>
            <p className="text-center text-[7px] text-zinc-900 font-black tracking-widest uppercase">System Version 2.0.0 | Elite Harmony</p>
          </div>
        </aside>
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/80 backdrop-blur-2xl border-t border-white/5 px-4 py-4 flex items-center justify-around z-50 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-[2rem] text-left">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1.5 transition-all relative ${isActive ? 'text-[#C5A059]' : 'text-zinc-600'}`}
              >
                <item.icon size={18} className={isActive ? 'drop-shadow-[0_0_8px_rgba(197,160,89,0.5)]' : ''} />
                <span className="text-[7px] font-black uppercase tracking-widest text-left">{item.label}</span>
                {isActive && <motion.div layoutId="mobile-indicator" className="absolute -top-4 w-5 h-0.5 bg-[#C5A059] rounded-full shadow-[0_0_10px_#C5A059]" />}
              </button>
            );
          })}
        </nav>
        <main className="flex-1 min-h-screen lg:px-12 px-4 py-8 overflow-x-hidden flex flex-col items-center text-left">
          <div className="w-full max-w-6xl text-left">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 text-left">
              <div className="text-left">
                <h1 className="text-2xl md:text-5xl font-black text-white tracking-tight uppercase text-left">{activeTab === 'agenda' ? 'Agenda Diária' : activeTab === 'faturamento' ? 'Faturamento' : activeTab === 'clientes' ? 'Meus Clientes' : 'Agenda da Semana'}</h1>
                {activeTab === 'clientes' && <div className="mt-2 inline-block px-3 py-1 bg-white/[0.02] border border-white/5 rounded backdrop-blur-md text-left"><span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-widest text-left">{clients.length} CLIENTES NO TOTAL</span></div>}
              </div>
              <div className="flex items-center gap-4 text-left">
                {activeTab === 'clientes' ? <button className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-2xl font-black text-[10px] transition-all uppercase tracking-[0.2em] shadow-xl active:scale-95 text-left">💬 ENVIAR P/ TODOS</button> : activeTab === 'faturamento' ? null : <button onClick={() => setIsCreatingBooking(true)} className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-2xl font-black text-[10px] transition-all uppercase tracking-[0.2em] shadow-xl active:scale-95 text-left"><Plus size={14} /><span>Novo Corte</span></button>}
              </div>
            </header>
            {loading ? <div className="flex items-center justify-center h-[50vh]"><div className="w-10 h-10 border-3 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div></div> : (
              <AnimatePresence mode="wait">
                {activeTab === 'agenda' && (
                  <motion.div key="agenda" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 md:gap-12 items-start text-left">
                    <div className="space-y-12 text-left">
                      <div className="space-y-6 text-left">
                        <h3 className="text-[11px] font-black text-[#C5A059] uppercase tracking-[0.5em] ml-1 opacity-60 text-left">Próximo Corte</h3>
                        {nextBooking ? (
                          <div onClick={() => nextBooking.booking && setViewingBooking(nextBooking.booking)} className="bg-neutral-900/50 border-y border-r border-white/5 border-l-4 border-l-[#C5A059] shadow-3xl rounded-[2.5rem] p-10 md:p-14 flex items-center justify-between transition-all cursor-pointer hover:bg-neutral-900 hover:border-white/10 group text-left">
                            <div className="flex items-center gap-10 md:gap-16 text-left">
                              <span className="text-5xl md:text-8xl font-black text-[#C5A059] tracking-tighter drop-shadow-2xl text-left">{nextBooking.time}</span>
                              <div className="h-16 w-[1px] bg-white/10 text-left" />
                              <div className="space-y-1 text-left">
                                <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest text-left">Cliente Especial</p>
                                <p className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight break-words italic group-hover:text-[#C5A059] transition-colors text-left">{nextBooking.booking?.clients?.name}</p>
                              </div>
                            </div>
                            <ChevronRight size={32} className="text-zinc-800 group-hover:text-[#C5A059] group-hover:translate-x-1 transition-all" />
                          </div>
                        ) : <div className="flex flex-col items-center justify-center py-20 bg-neutral-900/20 rounded-[2.5rem] border border-dashed border-white/5 text-left"><p className="text-sm text-zinc-700 italic font-black uppercase tracking-widest text-left">Nenhum corte agendado.</p></div>}
                      </div>
                      <div className="space-y-8 text-left">
                        <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.5em] ml-1 text-left">Agenda do Dia</h3>
                        {occupiedSlots.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                            {occupiedSlots.map((slot, i) => (
                              <div key={i} onClick={() => slot.booking && setViewingBooking(slot.booking)} className="bg-neutral-900/50 border border-white/5 backdrop-blur-md p-8 rounded-[2rem] shadow-2xl transition-all hover:bg-neutral-900 hover:border-white/10 cursor-pointer group text-left">
                                <div className="flex items-center justify-between text-left">
                                  <div className="flex items-center gap-6 text-left">
                                    <span className="text-2xl font-black text-white group-hover:text-[#C5A059] transition-colors italic text-left">{slot.time}</span>
                                    <div className="w-[1px] h-6 bg-[#C5A059]/20 text-left" />
                                    <span className="text-sm font-black text-zinc-400 uppercase tracking-tight truncate max-w-[140px] text-left">{slot.booking?.clients?.name}</span>
                                  </div>
                                  <ChevronRight size={18} className="text-zinc-800 group-hover:text-[#C5A059] transition-all" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <div className="flex flex-col items-center justify-center py-16 border border-white/5 rounded-[2rem] border-dashed opacity-30 text-left"><p className="text-xs text-zinc-500 italic font-black uppercase tracking-widest text-left">Dia livre.</p></div>}
                      </div>
                      <div className="space-y-8 text-left">
                        <div className="flex items-center justify-between text-left"><h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.5em] ml-1 text-left">Slots Livres</h3><span className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.2em] px-3 py-1 bg-[#C5A059]/5 border border-[#C5A059]/20 rounded-full text-left">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span></div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 text-left">
                          {timeSlots.filter(time => !todayBookings.some(b => b.booking_time.slice(0, 5) === time)).map((time) => (
                            <div key={time} onClick={() => setIsCreatingBooking(true)} className="bg-neutral-900/30 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center hover:bg-[#C5A059]/5 hover:border-[#C5A059]/40 cursor-pointer transition-all group shadow-lg text-left">
                              <span className="text-lg font-black text-white group-hover:text-[#C5A059] transition-colors text-left">{time}</span>
                              <span className="text-[8px] text-zinc-800 uppercase font-black tracking-widest mt-1 text-left">Livre</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <aside className="space-y-6 lg:sticky lg:top-12 text-left">
                      <div className="bg-[#0D0D0D] border border-white/10 backdrop-blur-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] rounded-[3rem] p-10 transition-all hover:border-[#C5A059]/30 relative overflow-hidden group text-left">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-12 -mt-12 text-left" />
                        <span className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.5em] block mb-8 text-left">Receita Estimada</span>
                        <div className="flex items-baseline gap-3 text-left"><span className="text-3xl font-bold text-[#D4AF37] opacity-40 italic text-left">R$</span><span className="text-6xl font-black text-[#D4AF37] tracking-tighter leading-none drop-shadow-2xl text-left">{todayRevenue.toFixed(0)}</span></div>
                      </div>
                      <div className="bg-[#0D0D0D] border border-white/10 backdrop-blur-3xl shadow-3xl rounded-[3rem] p-10 relative overflow-hidden group text-left">
                         <div className="flex flex-col text-left">
                            <span className="text-6xl font-black text-white tracking-tighter leading-none text-left">{availableSlots}</span>
                            <span className="text-[11px] text-zinc-700 font-black uppercase tracking-[0.5em] mt-3 text-left">Vagas Abertas</span>
                         </div>
                      </div>
                    </aside>
                  </motion.div>
                )}
                {activeTab === 'semanal' && (
                  <motion.div key="semanal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12 text-left">
                    <div className="flex flex-wrap gap-4 pb-12 border-b border-white/5 text-left">
                      {weekDays.map((day, i) => (
                        <button key={i} onClick={() => setSelectedWeeklyDate(day.full)} className={`flex flex-col items-center justify-center w-20 h-20 rounded-[1.8rem] border transition-all duration-500 shadow-xl ${selectedWeeklyDate === day.full ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059] scale-110' : 'border-white/5 bg-neutral-900/30 text-zinc-700 hover:border-white/20'}`}><span className="text-[9px] font-black uppercase mb-1 tracking-widest">{day.short}</span><span className="text-2xl font-black leading-none">{day.num}</span></button>
                      ))}
                    </div>
                    <div className="space-y-10 text-left">
                       <h3 className="text-[12px] font-black text-zinc-700 uppercase tracking-[0.8em] ml-2 italic text-left">AGENDA DA ELITE — {new Date(selectedWeeklyDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                          {bookings.filter(b => b.booking_date === selectedWeeklyDate).length > 0 ? bookings.filter(b => b.booking_date === selectedWeeklyDate).map((b, i) => (
                            <div key={i} onClick={() => setViewingBooking(b)} className="bg-neutral-900/50 border border-white/5 backdrop-blur-md p-8 rounded-[2rem] shadow-2xl transition-all hover:bg-neutral-900 hover:border-[#C5A059]/30 cursor-pointer group text-left"><div className="flex items-center justify-between text-left"><div className="flex items-center gap-6 text-left"><span className="text-2xl font-black text-white italic text-left">{b.booking_time.slice(0, 5)}</span><div className="w-[1px] h-6 bg-white/10 text-left" /><span className="text-sm font-black text-zinc-400 uppercase tracking-tight truncate max-w-[140px] text-left">{b.clients?.name}</span></div><ChevronRight size={20} className="text-zinc-800 group-hover:text-[#C5A059] transition-all" /></div></div>
                          )) : <div className="col-span-full flex flex-col items-center justify-center py-24 bg-neutral-900/10 rounded-[4rem] border border-dashed border-white/5 opacity-40 text-left"><CalendarDays size={64} className="text-zinc-900 mb-6 text-left" /><p className="text-sm text-zinc-700 italic uppercase font-black tracking-widest text-left">Nenhuma reserva para este dia.</p></div>}
                       </div>
                    </div>
                  </motion.div>
                )}
                {activeTab === 'faturamento' && (
                  <motion.div key="faturamento" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-16 text-left">
                    <div className="flex justify-center text-left">
                      <div className="flex bg-neutral-900/50 border border-white/5 p-1.5 rounded-[2rem] backdrop-blur-3xl shadow-2xl text-left">
                        {[
                          { id: 'semanal', label: 'Dashboard Semanal' },
                          { id: 'mensal', label: 'Dashboard Mensal' }
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setViewMode(tab.id as 'semanal' | 'mensal')}
                            className={`px-10 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-700 ${
                              viewMode === tab.id 
                              ? 'bg-[#C5A059] text-black shadow-3xl scale-[1.02]' 
                              : 'text-zinc-700 hover:text-zinc-400'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {viewMode === 'semanal' ? (
                      <div className="space-y-10 text-left">
                        <div className="bg-[#0D0D0D] border border-white/10 backdrop-blur-3xl p-16 md:p-24 rounded-[4rem] flex flex-col items-center justify-center text-center shadow-[0_80px_150px_-30px_rgba(0,0,0,0.9)] relative overflow-hidden group text-left">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent text-left" />
                          <div className="flex items-center gap-4 mb-8 opacity-40 text-left"><DollarSign size={20} className="text-[#C5A059]" /><span className="text-[11px] text-zinc-500 font-black tracking-[0.6em] uppercase italic text-left">Revenue Insight (Week)</span></div>
                          <div className="flex items-baseline gap-4 text-left"><span className="text-4xl font-bold text-[#D4AF37] opacity-30 italic leading-none text-left">R$</span><h2 className="text-7xl md:text-[9rem] font-black text-[#D4AF37] tracking-tighter leading-none drop-shadow-3xl text-left">{weeklyRevenue.toFixed(0)}</h2></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                          {StatCards(weeklyBookings, clients)}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-10 text-left">
                        <div className="bg-[#0D0D0D] border border-white/10 backdrop-blur-3xl p-16 md:p-24 rounded-[4rem] flex flex-col items-center justify-center text-center shadow-[0_80px_150px_-30px_rgba(0,0,0,0.9)] relative overflow-hidden group text-left">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent text-left" />
                          <div className="flex items-center gap-4 mb-8 opacity-40 text-left"><DollarSign size={20} className="text-[#C5A059]" /><span className="text-[11px] text-zinc-500 font-black tracking-[0.6em] uppercase italic text-left">Revenue Insight (Month)</span></div>
                          <div className="flex items-baseline gap-4 text-left"><span className="text-4xl font-bold text-[#D4AF37] opacity-30 italic leading-none text-left">R$</span><h2 className="text-7xl md:text-[9rem] font-black text-[#D4AF37] tracking-tighter leading-none drop-shadow-3xl text-left">{monthlyRevenue.toFixed(0)}</h2></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                          {StatCards(monthlyBookings, clients)}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
                {activeTab === 'clientes' && (
                  <motion.div key="clientes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12 text-left">
                    <div className="w-full max-w-2xl mx-auto space-y-10 text-left">
                      <div className="relative group shadow-3xl text-left"><Search className="absolute left-8 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-[#C5A059] transition-colors text-left" size={22} /><input type="text" placeholder="PESQUISAR CLIENTE..." className="w-full bg-neutral-900/50 border border-white/10 rounded-3xl h-20 pl-20 pr-8 outline-none text-sm font-black text-white focus:border-[#C5A059] transition-all placeholder:text-zinc-900 uppercase tracking-[0.3em] shadow-inner text-left" /></div>
                      <div className="grid grid-cols-1 gap-4 text-left">
                        {clients.length > 0 ? clients.map((client) => (
                          <div key={client.id} onClick={() => setViewingClient(client)} className="bg-neutral-900/30 border border-white/5 p-6 md:p-8 rounded-[2rem] flex items-center justify-between hover:bg-neutral-900 hover:border-white/10 transition-all group cursor-pointer shadow-xl text-left">
                            <div className="flex items-center gap-8 text-left">
                              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden group-hover:border-[#C5A059]/30 transition-all shrink-0 shadow-2xl text-left">
                                 <img 
                                   src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(client.name)}&backgroundColor=0a0a0a&fontFamily=serif&fontSize=40`} 
                                   alt={client.name} 
                                   className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500 text-left"
                                 />
                              </div>
                              <div className="space-y-1 text-left">
                                 <p className="text-white font-black uppercase tracking-tight text-xl leading-none text-left">{client.name}</p>
                                 <p className="text-[11px] text-zinc-700 font-bold tracking-[0.2em] text-left">{client.phone}</p>
                              </div>
                            </div>
                            <ChevronRight size={24} className="text-zinc-900 group-hover:text-[#C5A059] group-hover:translate-x-1 transition-all text-left" />
                          </div>
                        )) : <div className="flex flex-col items-center justify-center py-20 bg-neutral-900/10 rounded-[3rem] border border-dashed border-white/5 opacity-40 text-left"><p className="text-sm text-zinc-700 font-black uppercase tracking-[0.5em] text-left">Nenhum cliente cadastrado.</p></div>}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const StatCards = (data: Booking[], clients: Client[]) => {
  return [
    { label: 'Cancelados', value: data.filter(b => b.status === 'cancelled').length.toString(), icon: Scissors },
    { label: 'Novos Membros', value: clients.length.toString(), icon: Users },
    { label: 'Cortes Elite', value: data.filter(b => b.status !== 'cancelled').length.toString(), icon: CheckCircle }
  ].map((stat, i) => (
    <div key={i} className="bg-neutral-900/30 border border-white/5 p-10 rounded-[2.5rem] flex flex-col justify-between h-44 shadow-2xl hover:border-white/10 transition-all group text-left">
      <div className="flex justify-between items-start text-left text-left"><p className="text-[10px] text-zinc-700 uppercase tracking-[0.5em] font-black group-hover:text-zinc-500 transition-colors text-left">{stat.label}</p><stat.icon size={18} className="text-zinc-900 group-hover:text-[#C5A059] transition-colors text-left" /></div>
      <p className="text-5xl font-black text-white tracking-tighter italic text-left text-left">{stat.value}</p>
    </div>
  ));
};

export default AdminDashboard;
