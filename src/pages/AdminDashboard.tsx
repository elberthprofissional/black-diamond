import React, { useState, useEffect, useCallback } from 'react';
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
  Scissors
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
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
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
    } catch (error) {
      console.error(error);
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
      setSelectedBooking(null);
      fetchData();
    } catch (error) {
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
        .eq('id', selectedBooking.id);
      
      if (error) throw error;
      
      setToast({ message: 'Reagendamento concluído!', type: 'success' });
      setIsRescheduling(false);
      setSelectedBooking(null);
      fetchData();
    } catch (error) {
      setToast({ message: 'Erro ao reagendar.', type: 'error' });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.booking_date === today);
  
  const todayRevenue = todayBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  // Lógica Semanal (7 dias atrás)
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const weeklyBookings = bookings.filter(b => new Date(b.booking_date) >= lastWeekDate);
  const weeklyRevenue = weeklyBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  // Lógica Mensal (30 dias atrás)
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

  const menuItems = [
    { id: 'agenda', label: 'Agenda', icon: Clock },
    { id: 'faturamento', label: 'Finanças', icon: TrendingUp },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'semanal', label: 'Agenda da Semana', icon: Calendar },
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

  if (isCreatingBooking) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="min-h-screen bg-[#0A0A0A] text-white p-6 lg:p-12 selection:bg-gold-600/30"
      >
        <header className="max-w-4xl mx-auto flex items-center justify-between mb-12">
          <button 
            onClick={() => setIsCreatingBooking(false)}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-xs font-bold tracking-widest"
          >
            <ChevronLeft size={18} />
            Voltar
          </button>
          <div className="text-right">
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Novo Agendamento</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <User size={14} className="text-[#C5A059]" />
                Informações do Cliente
              </h3>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="NOME COMPLETO"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl h-14 px-6 outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-bold placeholder:text-zinc-800"
                />
                <input 
                  type="tel" 
                  placeholder="WHATSAPP (DDD)"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl h-14 px-6 outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-bold placeholder:text-zinc-800"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Scissors size={14} className="text-[#C5A059]" />
                Serviço Escolhido
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {services.map((s) => (
                  <button key={s.id} className="group flex items-center justify-between py-4 px-6 bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-xl hover:bg-white/10 hover:border-[#C5A059]/50 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white">{s.name}</span>
                    <span className="text-xs font-bold text-[#C5A059]">R$ {Number(s.price).toFixed(0)}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} className="text-[#C5A059]" />
                Data e Horário
              </h3>
              <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-2xl">
                <input 
                  type="date" 
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 outline-none text-xs font-bold uppercase tracking-widest focus:border-[#C5A059]"
                />
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {timeSlots.map(t => (
                    <button key={t} className="py-3 text-[10px] font-bold border border-white/10 rounded-xl bg-white/[0.03] hover:bg-[#C5A059] hover:text-black transition-all uppercase">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <button 
              onClick={handleCreateBooking}
              className="w-full bg-[#C5A059] text-black h-16 rounded-xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(197,160,89,0.3)] hover:translate-y-[-2px] hover:bg-[#F5E0A3] transition-all"
            >
              <CheckCircle size={20} />
              Confirmar Agendamento
            </button>
          </div>
        </main>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-400 font-sans selection:bg-gold-600/30 pb-20 lg:pb-0">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-10 left-1/2 md:left-[calc(50%+160px)] z-[100] px-8 py-4 rounded-xl border backdrop-blur-md shadow-2xl ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex relative z-10">
        {/* Desktop Sidebar */}
        <aside className="w-80 h-screen sticky top-0 bg-[#0A0A0A] border-r border-white/5 flex flex-col hidden lg:flex">
          <div className="flex-1 py-14">
            <div className="flex items-center gap-5 mb-20 group cursor-pointer px-10" onClick={() => navigate('/')}>
              <img src="/assets/logo.webp" alt="Black Diamond" className="w-14 h-14 object-contain" />
              <h1 className="text-white font-bold text-lg tracking-tight uppercase whitespace-nowrap">Black Diamond</h1>
            </div>

            <nav className="space-y-3">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-5 px-10 py-4.5 transition-all duration-300 font-medium ${
                    activeTab === item.id 
                    ? 'bg-white/5 border-r-4 border-[#C5A059] text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <item.icon size={24} className="text-[#C5A059]" />
                  <span className="text-sm uppercase tracking-widest font-bold">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-6 border-t border-white/5">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-500 hover:text-red-400 transition-all text-sm font-bold uppercase tracking-widest"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </aside>

        {/* Mobile Bottom Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-white/5 px-6 py-3 flex items-center justify-between z-50 lg:hidden">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id ? 'text-[#C5A059]' : 'text-zinc-500'
              }`}
            >
              <item.icon size={20} className="text-[#C5A059]" />
              <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
          <button 
            onClick={() => navigate('/')}
            className="flex flex-col items-center gap-1 text-zinc-600"
          >
            <LogOut size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">Sair</span>
          </button>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 min-h-screen lg:px-12 px-6 py-10 overflow-x-hidden">
          {/* Top Bar */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {activeTab === 'agenda' ? 'Agenda Diária' : activeTab === 'faturamento' ? 'Faturamento' : activeTab === 'clientes' ? 'Meus Clientes' : 'Agenda da Semana'}
              </h1>
              {activeTab === 'clientes' && (
                <div className="mt-2 inline-block px-3 py-1 bg-white/[0.02] border border-white/5 rounded backdrop-blur-md">
                  <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest">{clients.length} CLIENTES NO TOTAL</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {activeTab === 'clientes' ? (
                <button className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl font-bold text-xs transition-all uppercase tracking-wide">
                  💬 ENVIAR P/ TODOS
                </button>
              ) : activeTab === 'faturamento' ? null : (
                <button 
                  onClick={() => setIsCreatingBooking(true)}
                  className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl font-bold text-xs transition-all uppercase tracking-wide shadow-lg"
                >
                  <Plus size={16} />
                  <span>Novo Corte</span>
                </button>
              )}
            </div>
          </header>

          {loading ? (
            <div className="flex items-center justify-center h-[50vh]">
              <div className="w-12 h-12 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'agenda' && (
                <motion.div 
                  key="agenda"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12"
                >
                  <div className="space-y-12">
                    <div className="space-y-6">
                      <h3 className="text-xs font-bold text-[#C5A059] uppercase tracking-[0.2em]">Próximo Corte</h3>
                      {nextBooking ? (
                        <div className="bg-[#C5A059]/90 backdrop-blur-md p-8 rounded-2xl flex items-center justify-between shadow-2xl border border-[#C5A059]/50">
                          <div className="flex items-center gap-8">
                            <span className="text-5xl font-black text-black tracking-tighter">{nextBooking.time}</span>
                            <div className="h-12 w-[1px] bg-black/20" />
                            <div>
                              <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Cliente</p>
                              <p className="text-2xl font-bold text-black uppercase tracking-tight">{nextBooking.booking?.clients?.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Status</p>
                            <p className="text-[10px] font-bold text-black uppercase bg-black/10 px-3 py-1 rounded-full">Confirmado</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                          <p className="text-sm text-neutral-500 italic font-medium">Nenhum corte agendado para o restante do dia.</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Horários Ocupados</h3>
                      {occupiedSlots.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {occupiedSlots.map((slot, i) => (
                            <div 
                              key={i} 
                              onClick={() => setSelectedBooking(slot.booking)}
                              className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all hover:bg-white/[0.04] cursor-pointer group"
                            >
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
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 border border-white/5 rounded-2xl border-dashed">
                          <p className="text-sm text-neutral-500 italic">Nenhum agendamento ocupado.</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Horários Disponíveis</h3>
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                        {timeSlots
                          .filter(time => !todayBookings.some(b => b.booking_time.slice(0, 5) === time))
                          .map((time) => (
                            <div 
                              key={time} 
                              onClick={() => setIsCreatingBooking(true)}
                              className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-white/10 hover:border-[#C5A059]/50 cursor-pointer transition-colors group"
                            >
                              <span className="text-lg font-bold text-white group-hover:text-[#C5A059] transition-colors">{time}</span>
                              <span className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">Livre</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Coluna Direita (Cards) */}
                  <div className="space-y-6 hidden lg:block">
                    <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md shadow-2xl rounded-2xl p-8 transition-all hover:bg-white/[0.04] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-12 -mt-12 transition-all group-hover:bg-[#D4AF37]/10" />
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest block mb-6">Lucro de Hoje</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#D4AF37] opacity-40">R$</span>
                        <span className="text-5xl font-black text-[#D4AF37] tracking-tighter drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]">{todayRevenue.toFixed(0)}</span>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md shadow-2xl rounded-2xl p-8 transition-all hover:bg-white/[0.04] relative overflow-hidden group">
                      <div className="flex flex-col">
                        <span className="text-5xl font-black text-white tracking-tighter leading-none">{availableSlots}</span>
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em] mt-2">Vagas Livres</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'semanal' && (
                <motion.div 
                  key="semanal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="flex flex-wrap gap-3 pb-10 border-b border-white/5">
                    {[
                      { d: 'SEG', n: '08' }, { d: 'TER', n: '09' }, { d: 'QUA', n: '10' },
                      { d: 'QUI', n: '11', current: true }, { d: 'SEX', n: '12' }, { d: 'SÁB', n: '13' }
                    ].map((day, i) => (
                      <button 
                        key={i} 
                        className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border transition-all duration-300 ${
                          day.current 
                          ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' 
                          : 'border-white/5 bg-white/[0.02] text-zinc-600 hover:border-white/20'
                        }`}
                      >
                        <span className="text-[8px] font-bold uppercase mb-1 tracking-widest">{day.d}</span>
                        <span className="text-lg font-black">{day.n}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col items-center justify-center py-20">
                    <p className="text-sm text-neutral-500 italic">Selecione um dia para ver os agendamentos.</p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'faturamento' && (
                <motion.div 
                  key="faturamento"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
                    <div className="flex gap-2 bg-white/[0.03] p-1.5 rounded-xl border border-white/5 backdrop-blur-md">
                      <button 
                        onClick={() => setViewMode('semanal')}
                        className={`px-8 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          viewMode === 'semanal' 
                          ? 'bg-[#C5A059] text-black shadow-lg shadow-[#C5A059]/20' 
                          : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Semanal
                      </button>
                      <button 
                        onClick={() => setViewMode('mensal')}
                        className={`px-8 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          viewMode === 'mensal' 
                          ? 'bg-[#C5A059] text-black shadow-lg shadow-[#C5A059]/20' 
                          : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Mensal
                      </button>
                    </div>
                  </div>

                  {viewMode === 'semanal' ? (
                    <div className="space-y-12">
                      <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 backdrop-blur-md p-16 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                            <DollarSign size={16} className="text-zinc-400" />
                          </div>
                          <span className="text-[10px] text-zinc-500 font-bold tracking-[0.4em] uppercase opacity-60">Lucro da Semana</span>
                        </div>
                        <div className="flex items-baseline gap-4">
                          <span className="text-4xl font-bold text-[#D4AF37] opacity-40">R$</span>
                          <h2 className="text-6xl font-black text-[#D4AF37] tracking-tighter leading-none drop-shadow-md">{weeklyRevenue.toFixed(0)}</h2>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                          { label: 'Cancelamentos', value: weeklyBookings.filter(b => b.status === 'cancelled').length.toString(), icon: Scissors },
                          { label: 'Novos Clientes', value: clients.length.toString(), icon: Users },
                          { label: 'Atendimentos Realizados', value: weeklyBookings.length.toString(), icon: CheckCircle },
                        ].map((stat, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all hover:bg-white/[0.05] group relative flex flex-col justify-between h-36">
                            <div className="flex justify-between items-start">
                              <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">{stat.label}</p>
                              <stat.icon size={18} className="text-zinc-500 opacity-60" />
                            </div>
                            <p className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-12">
                      <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 backdrop-blur-md p-16 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                            <DollarSign size={16} className="text-zinc-400" />
                          </div>
                          <span className="text-[10px] text-zinc-500 font-bold tracking-[0.4em] uppercase opacity-60">Lucro do Mês</span>
                        </div>
                        <div className="flex items-baseline gap-4">
                          <span className="text-4xl font-bold text-[#D4AF37] opacity-40">R$</span>
                          <h2 className="text-6xl font-black text-[#D4AF37] tracking-tighter leading-none drop-shadow-md">{monthlyRevenue.toFixed(0)}</h2>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-8 rounded-2xl shadow-xl flex flex-col justify-center min-h-[160px] relative group overflow-hidden transition-all hover:bg-white/[0.04]">
                          <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-4">Cancelamentos no Mês</p>
                          <p className="text-5xl font-black text-white tracking-tighter">{monthlyBookings.filter(b => b.status === 'cancelled').length.toString()}</p>
                          <div className="w-10 h-1 bg-red-500/20 mt-6 rounded-full" />
                          <Scissors size={24} className="absolute top-6 right-6 text-zinc-600/20" />
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-8 rounded-2xl shadow-xl flex flex-col justify-center min-h-[160px] relative group overflow-hidden transition-all hover:bg-white/[0.04]">
                          <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-4">Novos Clientes no Mês</p>
                          <p className="text-5xl font-black text-[#D4AF37] tracking-tighter">{clients.length}</p>
                          <div className="w-10 h-1 bg-[#D4AF37]/20 mt-6 rounded-full" />
                          <Users size={24} className="absolute top-6 right-6 text-zinc-600/20" />
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-8 rounded-2xl shadow-xl flex flex-col justify-center min-h-[160px] relative group overflow-hidden transition-all hover:bg-white/[0.04]">
                          <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-4">Atendimentos no Mês</p>
                          <p className="text-5xl font-black text-white tracking-tighter">{monthlyBookings.length}</p>
                          <div className="w-10 h-1 bg-white/10 mt-6 rounded-full" />
                          <CheckCircle size={24} className="absolute top-6 right-6 text-zinc-600/20" />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'clientes' && (
                <motion.div 
                  key="clientes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="w-full max-w-2xl mx-auto space-y-12 py-6">
                    <div className="relative group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#C5A059] transition-colors" size={20} />
                      <input 
                        type="text" 
                        placeholder="Pesquisar por nome ou WhatsApp..."
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl h-16 pl-16 pr-6 outline-none text-sm text-white focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all placeholder:text-zinc-700 italic shadow-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {clients.length > 0 ? (
                        clients.map((client) => (
                          <div key={client.id} className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-6 rounded-2xl flex items-center justify-between hover:bg-white/[0.04] transition-all group">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 bg-[#C5A059]/10 rounded-full flex items-center justify-center border border-[#C5A059]/20 group-hover:bg-[#C5A059]/20 transition-all">
                                <User size={20} className="text-[#C5A059]" />
                              </div>
                              <div>
                                <p className="text-white font-bold uppercase tracking-tight">{client.name}</p>
                                <p className="text-xs text-zinc-500 font-medium">{client.phone}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">Cadastrado em</p>
                              <p className="text-xs text-zinc-400">{new Date(client.created_at).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                          <p className="text-sm text-neutral-500 italic font-medium tracking-wide">Nenhum cliente encontrado.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Modal de Detalhes do Agendamento */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if(!isRescheduling) setSelectedBooking(null); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                {!isRescheduling ? (
                  <div className="space-y-10">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-[#C5A059] uppercase tracking-[0.4em]">Detalhes do Corte</span>
                        <h2 className="text-3xl font-serif font-bold text-white uppercase tracking-tight">{selectedBooking.clients?.name}</h2>
                        <p className="text-xs text-zinc-500 font-medium tracking-wide">{selectedBooking.clients?.phone}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <Clock size={24} className="text-[#C5A059]" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                      <div>
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Horário</p>
                        <p className="text-lg font-black text-white tracking-tighter">{selectedBooking.booking_time.slice(0, 5)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Valor</p>
                        <p className="text-lg font-black text-[#C5A059] tracking-tighter uppercase">R$ {Number(selectedBooking.total_price).toFixed(0)}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => {
                            setRescheduleData({ date: selectedBooking.booking_date, time: selectedBooking.booking_time.slice(0, 5) });
                            setIsRescheduling(true);
                          }}
                          className="flex items-center justify-center gap-2 bg-white text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
                        >
                          Reagendar
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}
                          className="flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                      <button 
                        onClick={() => setSelectedBooking(null)}
                        className="w-full bg-white/5 text-zinc-500 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all"
                      >
                        Fechar Janela
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                      <button onClick={() => setIsRescheduling(false)} className="text-zinc-500 hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                      </button>
                      <h2 className="text-xl font-serif font-bold text-white uppercase tracking-widest italic">Novo Horário</h2>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Data do Reagendamento</label>
                        <input 
                          type="date" 
                          value={rescheduleData.date}
                          onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 text-white p-5 rounded-xl outline-none focus:border-[#C5A059] transition-all text-xs font-bold uppercase tracking-widest"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Novo Horário</label>
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.map(t => (
                            <button 
                              key={t}
                              onClick={() => setRescheduleData({...rescheduleData, time: t})}
                              className={`py-3 text-[10px] font-bold border rounded-lg transition-all ${
                                rescheduleData.time === t 
                                ? 'border-[#C5A059] bg-[#C5A059]/10 text-white' 
                                : 'border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/20'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-4">
                        <button 
                          onClick={handleReschedule}
                          className="w-full bg-[#C5A059] text-black py-5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#F5E0A3] transition-all"
                        >
                          Confirmar Reagendamento
                        </button>
                        <button 
                          onClick={() => setIsRescheduling(false)}
                          className="w-full bg-white/5 text-zinc-500 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
