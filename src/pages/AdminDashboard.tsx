import React, { useState, useEffect, useCallback } from 'react';
import { getBookings } from '../lib/api';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Plus, 
  Search,
  TrendingUp,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  User,
  CheckCircle,
  Scissors,
  CalendarDays,
  SearchX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('agenda');
  const [bookings, setBookings] = useState<any[]>([]);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const data = await getBookings();
      setBookings(data || []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.booking_date === today);
  
  const todayRevenue = todayBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_price), 0);
  const availableSlots = 21 - todayBookings.length;

  const timeSlots = [
    "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", 
    "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", 
    "16:30", "17:00", "17:30", "18:00", "18:30"
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "BOM DIA";
    if (hour >= 12 && hour < 18) return "BOA TARDE";
    return "BOA NOITE";
  };

  const menuItems = [
    { id: 'agenda', label: 'Agenda', icon: LayoutDashboard },
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

  if (isCreatingBooking) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="min-h-screen bg-[#0A0A0A] text-white p-6 lg:p-12"
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
                <User size={14} className="text-[#D4AF37]" />
                Informações do Cliente
              </h3>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="NOME COMPLETO"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl h-14 px-6 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all text-sm font-bold placeholder:text-zinc-800"
                />
                <input 
                  type="tel" 
                  placeholder="WHATSAPP (DDD)"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl h-14 px-6 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all text-sm font-bold placeholder:text-zinc-800"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Scissors size={14} className="text-[#D4AF37]" />
                Serviço Escolhido
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { n: 'Corte', p: '35' },
                  { n: 'Barba', p: '27' },
                  { n: 'Barba com Toalha Quente', p: '30' },
                  { n: 'Sobrancelha', p: '15' },
                  { n: 'Pezinho', p: '15' }
                ].map((s) => (
                  <button key={s.n} className="group flex items-center justify-between py-4 px-6 bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-xl hover:bg-white/10 hover:border-[#D4AF37]/50 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white">{s.n}</span>
                    <span className="text-xs font-bold text-[#D4AF37]">R$ {s.p}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} className="text-[#D4AF37]" />
                Data e Horário
              </h3>
              <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-2xl">
                <input 
                  type="date" 
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 outline-none text-xs font-bold uppercase tracking-widest focus:border-[#D4AF37]"
                />
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {timeSlots.map(t => (
                    <button key={t} className="py-3 text-[10px] font-bold border border-white/10 rounded-xl bg-white/[0.03] hover:bg-[#D4AF37] hover:text-black transition-all uppercase">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <button className="w-full bg-[#D4AF37] text-black h-16 rounded-xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.3)] hover:translate-y-[-2px] hover:bg-[#F5E0A3] transition-all">
              <CheckCircle size={20} />
              Confirmar Agendamento
            </button>
          </div>
        </main>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-400 font-sans selection:bg-[#D4AF37]/30 pb-20 lg:pb-0">
      <div className="flex relative z-10">
        {/* Desktop Sidebar (PRESERVED STRUCTURE, ENHANCED UI) */}
        <aside className="w-80 h-screen sticky top-0 bg-[#0A0A0A] border-r border-white/5 flex flex-col hidden lg:flex">
          <div className="px-0 py-10">
            <div className="flex items-center gap-4 mb-12 group cursor-pointer px-8" onClick={() => navigate('/')}>
              <img src="/assets/logo.webp" alt="Black Diamond" className="w-12 h-12 object-contain" />
              <h1 className="text-white font-bold text-base tracking-tight uppercase whitespace-nowrap">Black Diamond</h1>
            </div>

            <div className="px-8 mb-10">
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 tracking-widest uppercase font-semibold">{getGreeting()}</span>
                <span className="text-sm text-white font-bold tracking-wide">TATO</span>
              </div>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-8 py-3.5 transition-all duration-300 font-medium ${
                    activeTab === item.id 
                    ? 'bg-white/10 border-l-4 border-[#D4AF37] text-white shadow-lg' 
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon size={20} className={activeTab === item.id ? 'text-[#D4AF37]' : 'text-zinc-600'} />
                  <span className="text-sm uppercase tracking-wider">{item.label}</span>
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

        {/* Mobile Bottom Bar (PRESERVED) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-white/5 px-6 py-3 flex items-center justify-between z-50 lg:hidden">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id ? 'text-[#D4AF37]' : 'text-zinc-600'
              }`}
            >
              <item.icon size={20} />
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
                {activeTab === 'agenda' ? 'Agenda Diária' : activeTab === 'faturamento' ? 'Faturamento' : activeTab === 'clientes' ? 'Meus Clientes' : 'Agenda Semanal'}
              </h1>
              {activeTab === 'clientes' && (
                <div className="mt-2 inline-block px-3 py-1 bg-white/[0.02] border border-white/5 rounded backdrop-blur-md">
                  <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">0 CLIENTES NO TOTAL</span>
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
                  className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F5E0A3] text-black px-6 py-2.5 rounded-xl font-bold text-xs transition-all uppercase tracking-wide shadow-lg shadow-[#D4AF37]/20"
                >
                  <Plus size={16} />
                  <span>Novo Corte</span>
                </button>
              )}
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'agenda' && (
              <motion.div 
                key="agenda"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12"
              >
                {/* Coluna Esquerda */}
                <div className="space-y-12">
                  <div className="space-y-6">
                    <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Próximo Corte</h3>
                    {nextBooking ? (
                      <div className="bg-[#D4AF37]/90 backdrop-blur-md p-8 rounded-2xl flex items-center justify-between shadow-2xl border border-[#D4AF37]/50">
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
                        <CalendarDays className="text-white/10 w-12 h-12 mb-4" />
                        <p className="text-sm text-neutral-500 italic">Nenhum corte agendado para o restante do dia.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Horários Ocupados</h3>
                    {occupiedSlots.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {occupiedSlots.map((slot, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all hover:bg-white/[0.04]">
                            <div className="flex items-center gap-5">
                              <span className="text-xl font-bold text-white">{slot.time}</span>
                              <div className="w-[1px] h-5 bg-[#D4AF37]/30" />
                              <span className="text-sm font-bold text-zinc-300 uppercase tracking-tight truncate">{slot.booking?.clients?.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <CalendarDays className="text-white/10 w-12 h-12 mb-4" />
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
                            className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-white/10 hover:border-[#D4AF37]/50 cursor-pointer transition-colors group"
                          >
                            <span className="text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors">{time}</span>
                            <span className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">Livre</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Coluna Direita (Cards) - Apenas Desktop */}
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
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest block mb-8">Disponibilidade</span>
                      <div className="flex items-center justify-between">
                         <div className="flex flex-col">
                           <span className="text-5xl font-black text-white tracking-tighter leading-none">{availableSlots}</span>
                           <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em] mt-2">Vagas Livres</span>
                         </div>
                         <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-2 border-white/5 bg-white/5 group-hover:border-[#D4AF37]/30 transition-all">
                            <Calendar size={24} className="text-[#D4AF37] opacity-60" />
                            <div className="absolute inset-0 rounded-full bg-[#D4AF37]/5 blur-md animate-pulse" />
                         </div>
                      </div>
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
                <div className="flex flex-wrap gap-4 pb-10 border-b border-white/5">
                  {[
                    { d: 'SEG', n: '08' }, { d: 'TER', n: '09' }, { d: 'QUA', n: '10' },
                    { d: 'QUI', n: '11', current: true }, { d: 'SEX', n: '12' }, { d: 'SÁB', n: '13' }
                  ].map((day, i) => (
                    <button 
                      key={i} 
                      className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl border transition-all duration-300 ${
                        day.current 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.1)]' 
                        : 'border-white/5 bg-white/[0.02] text-zinc-600 hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase mb-2 tracking-widest">{day.d}</span>
                      <span className="text-2xl font-black">{day.n}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col items-center justify-center py-20">
                  <CalendarDays className="text-white/10 w-16 h-16 mb-6" />
                  <p className="text-sm text-neutral-500 italic max-w-xs text-center leading-relaxed">Selecione um dia acima para ver os detalhes da agenda e atendimentos confirmados.</p>
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Relatórios Financeiros</h2>
                    <p className="text-sm text-zinc-500 font-medium mt-1">Gestão consolidada da saúde econômica do estúdio.</p>
                  </div>
                  <div className="flex gap-2 bg-white/[0.03] p-1.5 rounded-xl border border-white/5 backdrop-blur-md">
                    <button 
                      onClick={() => setViewMode('semanal')}
                      className={`px-8 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        viewMode === 'semanal' 
                        ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' 
                        : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Semanal
                    </button>
                    <button 
                      onClick={() => setViewMode('mensal')}
                      className={`px-8 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        viewMode === 'mensal' 
                        ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' 
                        : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Mensal
                    </button>
                  </div>
                </div>

                {viewMode === 'semanal' ? (
                  <div className="space-y-12">
                    <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 backdrop-blur-md p-16 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl">
                      <span className="text-[10px] text-zinc-500 font-bold tracking-[0.4em] uppercase mb-8 opacity-60">Receita Bruta Acumulada</span>
                      <div className="flex items-baseline gap-4">
                        <span className="text-4xl font-bold text-[#D4AF37] opacity-40">R$</span>
                        <h2 className="text-6xl font-black text-[#D4AF37] tracking-tighter leading-none drop-shadow-md">{totalRevenue.toFixed(0)}</h2>
                      </div>
                      <div className="mt-10 px-6 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                        <p className="text-emerald-400/80 text-xs font-medium tracking-wide uppercase">+24.8% vs período anterior</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: 'Ticket Médio', value: `R$ ${(totalRevenue / (bookings.length || 1)).toFixed(0)}`, icon: DollarSign },
                        { label: 'Cancelamentos', value: '4.2%', icon: Scissors },
                        { label: 'Novos Clientes', value: '12', icon: Users },
                        { label: 'Taxa Retenção', value: '88.5%', icon: TrendingUp },
                      ].map((stat, i) => (
                        <div key={i} className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all hover:bg-white/[0.05] group relative flex flex-col justify-between h-36">
                          <div className="flex justify-between items-start">
                            <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">{stat.label}</p>
                            <stat.icon size={18} className="text-[#D4AF37] opacity-60" />
                          </div>
                          <p className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-10 rounded-2xl flex flex-col md:flex-row items-center justify-around text-center gap-12 shadow-xl border-dashed">
                      <div className="space-y-2">
                        <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Atendimentos Efetuados</p>
                        <p className="text-4xl font-black text-white tracking-tight">{bookings.length}</p>
                      </div>
                      <div className="h-16 w-[1px] bg-white/5 hidden md:block" />
                      <div className="space-y-2">
                        <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Faltas & No-show</p>
                        <p className="text-4xl font-black text-red-500/80 tracking-tighter">01</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12">
                    <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 backdrop-blur-md p-16 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl">
                      <span className="text-[10px] text-zinc-500 font-bold tracking-[0.4em] uppercase mb-8 opacity-60">Faturamento Mensal Estimado</span>
                      <div className="flex items-baseline gap-4">
                        <span className="text-4xl font-bold text-[#D4AF37] opacity-40">R$</span>
                        <h2 className="text-6xl font-black text-[#D4AF37] tracking-tighter leading-none drop-shadow-md">{(totalRevenue * 4.2).toFixed(0)}</h2>
                      </div>
                      <p className="text-[10px] text-gold-600/60 font-bold uppercase tracking-[0.3em] mt-10">Resumo Consolidado 30 dias</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-8 rounded-2xl text-center shadow-xl flex flex-col justify-center min-h-[160px]">
                        <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-4">Clientes Atendidos</p>
                        <p className="text-5xl font-black text-white tracking-tighter">{bookings.length * 4}</p>
                        <div className="w-10 h-1 bg-[#D4AF37]/20 mx-auto mt-6 rounded-full" />
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-8 rounded-2xl text-center shadow-xl flex flex-col justify-center min-h-[160px]">
                        <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-4">Cancelamentos Totais</p>
                        <p className="text-5xl font-black text-white tracking-tighter">04</p>
                        <div className="w-10 h-1 bg-red-500/20 mx-auto mt-6 rounded-full" />
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md p-8 rounded-2xl text-center shadow-xl border-[#D4AF37]/10 flex flex-col justify-center min-h-[160px]">
                        <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-4">Crescimento de Base</p>
                        <p className="text-5xl font-black text-[#D4AF37] tracking-tighter">48</p>
                        <div className="w-10 h-1 bg-[#D4AF37]/40 mx-auto mt-6 rounded-full" />
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
                <div className="w-full max-w-2xl mx-auto space-y-16 py-12">
                  <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#D4AF37] transition-colors" size={20} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por nome ou WhatsApp..."
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl h-16 pl-16 pr-6 outline-none text-sm text-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all placeholder:text-zinc-700 italic shadow-xl"
                    />
                  </div>

                  <div className="flex flex-col items-center justify-center py-12">
                    <SearchX className="text-white/10 w-16 h-16 mb-6" />
                    <p className="text-sm text-neutral-500 italic font-medium tracking-wide">Nenhum registro encontrado na base de clientes.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
