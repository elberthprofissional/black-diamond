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
  Scissors
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
                <User size={14} className="text-gold-600" />
                Informações do Cliente
              </h3>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="NOME COMPLETO"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-4 px-6 outline-none focus:border-gold-600/30 transition-all text-sm font-bold placeholder:text-zinc-800"
                />
                <input 
                  type="tel" 
                  placeholder="WHATSAPP (DDD)"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-4 px-6 outline-none focus:border-gold-600/30 transition-all text-sm font-bold placeholder:text-zinc-800"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Scissors size={14} className="text-gold-600" />
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
                  <button key={s.n} className="group flex items-center justify-between py-4 px-6 bg-white/[0.02] border border-white/5 rounded-lg hover:border-gold-600/30 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white">{s.n}</span>
                    <span className="text-xs font-bold text-gold-600">R$ {s.p}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} className="text-gold-600" />
                Data e Horário
              </h3>
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 space-y-6">
                <input 
                  type="date" 
                  className="w-full bg-black/40 border border-white/5 rounded py-3 px-4 outline-none text-xs font-bold uppercase tracking-widest"
                />
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {timeSlots.map(t => (
                    <button key={t} className="py-2 text-[10px] font-bold border border-white/5 rounded hover:bg-gold-600 hover:text-black transition-all">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <button className="w-full bg-gold-600 text-black py-5 rounded-lg font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.3)] hover:translate-y-[-2px] transition-all">
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
      <div className="flex relative z-10">
        {/* Desktop Sidebar */}
        <aside className="w-64 h-screen sticky top-0 bg-[#0A0A0A] border-r border-white/5 flex flex-col hidden lg:flex">
          <div className="px-0 py-10">
            <div className="flex items-center gap-4 mb-12 group cursor-pointer px-8" onClick={() => navigate('/')}>
              <img src="/assets/logo.webp" alt="Black Diamond" className="w-12 h-12 object-contain" />
              <h1 className="text-white font-bold text-base tracking-tight uppercase whitespace-nowrap">Black Diamond</h1>
            </div>

            <div className="px-8 mb-10">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] leading-relaxed">
                {getGreeting()},<br />TATO
              </p>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-8 py-4 transition-all duration-200 ${
                    activeTab === item.id 
                    ? 'bg-neutral-800 text-gold-600' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
                  }`}
                >
                  <item.icon size={20} className={activeTab === item.id ? 'text-gold-600' : 'text-zinc-600'} />
                  <span className="text-sm font-bold uppercase tracking-wide">{item.label}</span>
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
                activeTab === item.id ? 'text-gold-600' : 'text-zinc-600'
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
                <div className="mt-2 inline-block px-3 py-1 bg-white/5 rounded border border-white/5">
                  <span className="text-[10px] font-bold text-gold-600 uppercase tracking-widest">0 CLIENTES NO TOTAL</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {activeTab === 'clientes' ? (
                <button className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-md font-bold text-xs transition-all uppercase tracking-wide">
                  💬 ENVIAR P/ TODOS
                </button>
              ) : activeTab === 'faturamento' ? null : (
                <button 
                  onClick={() => setIsCreatingBooking(true)}
                  className="flex items-center gap-2 bg-gold-600 hover:bg-gold-500 text-black px-6 py-2.5 rounded-md font-bold text-xs transition-all uppercase tracking-wide shadow-lg shadow-gold-600/20"
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
                    <h3 className="text-xs font-bold text-gold-600 uppercase tracking-[0.2em]">Próximo Corte</h3>
                    {nextBooking ? (
                      <div className="bg-gold-600 p-6 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <span className="text-4xl font-black text-black">{nextBooking.time}</span>
                          <div className="h-10 w-[1px] bg-black/20" />
                          <div>
                            <p className="text-xs font-black text-black/60 uppercase">Cliente</p>
                            <p className="text-xl font-bold text-black uppercase">{nextBooking.booking?.clients?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-black/60 uppercase">Status</p>
                          <p className="text-xs font-bold text-black uppercase bg-black/10 px-2 py-1 rounded">Confirmado</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full py-8 border border-white/5 rounded-lg flex items-center justify-center bg-white/[0.01]">
                        <p className="text-xs text-zinc-600 italic font-medium uppercase tracking-widest">Nenhum corte agendado para o restante do dia.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Horários Ocupados</h3>
                    {occupiedSlots.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {occupiedSlots.map((slot, i) => (
                          <div key={i} className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-lg">
                            <span className="text-lg font-bold text-white">{slot.time}</span>
                            <div className="w-[2px] h-4 bg-gold-600/30" />
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-tight truncate">{slot.booking?.clients?.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="w-full py-8 border border-dashed border-white/5 rounded-lg flex items-center justify-center bg-white/[0.01]">
                        <p className="text-xs text-zinc-600 italic font-medium uppercase tracking-widest">Nenhum agendamento ocupado.</p>
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
                            className="p-4 rounded-md border border-white/10 flex flex-col items-center justify-center gap-1 hover:border-gold-600/50 transition-all duration-300 cursor-pointer group"
                          >
                            <span className="text-lg font-bold text-white group-hover:text-gold-600 transition-colors">{time}</span>
                            <span className="text-[10px] font-bold text-zinc-600 uppercase">Livre</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Coluna Direita (Cards) - Apenas Desktop */}
                <div className="space-y-6 hidden lg:block">
                  <div className="bg-[#141414] border border-white/5 p-8 rounded-lg">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-4">Lucro de Hoje</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">R$</span>
                      <span className="text-4xl font-bold text-gold-600">{todayRevenue.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="bg-[#141414] border border-white/5 p-8 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-6">Vagas para Hoje</span>
                    <div className="flex flex-col items-center">
                      <span className="text-6xl font-black text-gold-600 mb-2">{availableSlots}</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Vagas Livres</span>
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
                <div className="flex flex-wrap gap-3 pb-8 border-b border-white/5">
                  {[
                    { d: 'SEG', n: '08' }, { d: 'TER', n: '09' }, { d: 'QUA', n: '10' },
                    { d: 'QUI', n: '11', current: true }, { d: 'SEX', n: '12' }, { d: 'SÁB', n: '13' }
                  ].map((day, i) => (
                    <button 
                      key={i} 
                      className={`flex flex-col items-center justify-center w-20 h-20 rounded-md border transition-all duration-300 ${
                        day.current 
                        ? 'border-gold-600 bg-white/5 text-gold-600' 
                        : 'border-white/10 bg-transparent text-zinc-600 hover:border-white/20'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase mb-1">{day.d}</span>
                      <span className="text-xl font-bold">{day.n}</span>
                    </button>
                  ))}
                </div>

                <div className="w-full py-20 border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center bg-[#141414] text-center">
                  <Calendar size={32} className="mb-4 text-zinc-800" />
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Selecione um dia acima para ver os detalhes da agenda</p>
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Relatórios de Faturamento</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Acompanhe a saúde financeira da Black Diamond.</p>
                  </div>
                  <div className="flex gap-2 bg-neutral-900 p-1 rounded-lg border border-white/5">
                    <button 
                      onClick={() => setViewMode('semanal')}
                      className={`px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                        viewMode === 'semanal' 
                        ? 'bg-gold-600 text-black' 
                        : 'bg-neutral-800 text-zinc-400 border border-white/5'
                      }`}
                    >
                      Semanal
                    </button>
                    <button 
                      onClick={() => setViewMode('mensal')}
                      className={`px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                        viewMode === 'mensal' 
                        ? 'bg-gold-600 text-black' 
                        : 'bg-neutral-800 text-zinc-400 border border-white/5'
                      }`}
                    >
                      Mensal
                    </button>
                  </div>
                </div>

                {viewMode === 'semanal' ? (
                  <div className="space-y-8">
                    <div className="bg-[#141414] border border-white/5 p-16 rounded-lg flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] uppercase mb-8">Receita Bruta Total</span>
                      <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-bold text-white">R$</span>
                        <h2 className="text-8xl font-black text-gold-600 tracking-tighter leading-none">{totalRevenue.toFixed(0)}</h2>
                      </div>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-8">+24% vs mês anterior lucro da semana</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: 'Ticket Médio', value: `R$ ${(totalRevenue / (bookings.length || 1)).toFixed(0)}`, icon: DollarSign },
                        { label: 'Cancelamentos', value: '4%', icon: Scissors },
                        { label: 'Novos Clientes', value: '12', icon: Users },
                        { label: 'Retenção', value: '88%', icon: TrendingUp },
                      ].map((stat, i) => (
                        <div key={i} className="bg-[#141414] border border-white/5 p-8 rounded-lg hover:bg-white/[0.02] transition-colors group">
                          <div className="w-10 h-10 rounded bg-black border border-white/5 flex items-center justify-center mb-6">
                            {React.createElement(stat.icon as any, { size: 18, className: "text-gold-600" })}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">{stat.label}</p>
                          <p className="text-2xl font-bold text-white">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white/[0.01] border border-dashed border-white/5 p-8 rounded-lg flex flex-col md:flex-row items-center justify-around text-center gap-8">
                      <div>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Clientes Atendidos (Semana)</p>
                        <p className="text-3xl font-bold text-white">{bookings.length}</p>
                      </div>
                      <div className="h-12 w-[1px] bg-white/5 hidden md:block" />
                      <div>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Cancelamentos na Semana</p>
                        <p className="text-3xl font-bold text-red-500/80">1</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="bg-[#141414] border border-white/5 p-16 rounded-lg flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] uppercase mb-8">Lucro do Mês</span>
                      <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-bold text-white">R$</span>
                        <h2 className="text-8xl font-black text-gold-600 tracking-tighter leading-none">{(totalRevenue * 4).toFixed(0)}</h2>
                      </div>
                      <p className="text-[10px] text-gold-600/60 font-bold uppercase tracking-[0.2em] mt-8">Resumo Mensal Consolidado</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-[#141414] border border-white/5 p-8 rounded-lg text-center">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-4">Clientes no Mês</p>
                        <p className="text-4xl font-bold text-white">{bookings.length * 4}</p>
                        <p className="text-[10px] text-zinc-600 mt-2">Atendimentos totais</p>
                      </div>
                      <div className="bg-[#141414] border border-white/5 p-8 rounded-lg text-center">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-4">Cancelamentos (Mês)</p>
                        <p className="text-4xl font-bold text-white">4</p>
                        <p className="text-[10px] text-zinc-600 mt-2">Taxa de 3.2%</p>
                      </div>
                      <div className="bg-[#141414] border border-white/5 p-8 rounded-lg text-center">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-4">Novos Clientes</p>
                        <p className="text-4xl font-bold text-gold-600">48</p>
                        <p className="text-[10px] text-zinc-600 mt-2">Crescimento constante</p>
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
                <div className="w-full max-w-2xl mx-auto space-y-12 py-20">
                  <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-gold-600 transition-colors" size={20} />
                    <input 
                      type="text" 
                      placeholder="Buscar cliente..."
                      className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-5 pl-16 pr-6 outline-none text-sm text-white focus:border-gold-600/30 transition-all placeholder:text-zinc-700 italic"
                    />
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-zinc-700 italic font-medium">Nenhum cliente encontrado.</p>
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
