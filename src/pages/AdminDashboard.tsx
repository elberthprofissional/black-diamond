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
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('agenda');
  const [bookings, setBookings] = useState<any[]>([]);
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
    { id: 'agenda', label: 'Agenda Diária', icon: LayoutDashboard },
    { id: 'faturamento', label: 'Faturamento', icon: TrendingUp },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'semanal', label: 'Agenda Semanal', icon: Calendar },
  ];

  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const occupiedSlots = timeSlots
    .map(time => ({ time, booking: todayBookings.find(b => b.booking_time.slice(0, 5) === time) }))
    .filter(slot => slot.booking);

  const nextBooking = occupiedSlots
    .filter(slot => slot.time >= currentTime)
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-400 font-sans selection:bg-gold-600/30">
      <div className="flex relative z-10">
        {/* Sidebar */}
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
              ) : (
                <button className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-md font-bold text-xs transition-all uppercase tracking-wide">
                  <Plus size={16} />
                  <span>Novo Corte</span>
                </button>
              )}
            </div>
          </header>

          <AnimatePresence mode="wait">
            {(activeTab === 'agenda' || activeTab === 'semanal') && (
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12"
              >
                {/* Coluna Esquerda */}
                <div className="space-y-12">
                  {/* Próximo Corte */}
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

                  {/* Horários Ocupados */}
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

                  {/* Horários Disponíveis */}
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

                  {activeTab === 'semanal' && (
                    <div className="pt-8 space-y-8">
                       <div className="flex flex-wrap gap-3">
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
                    </div>
                  )}
                </div>

                {/* Coluna Direita (Cards) */}
                <div className="space-y-6">
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
                    <h2 className="text-2xl font-bold text-white tracking-tight">Faturamento</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Acompanhe o lucro da sua barbearia.</p>
                  </div>
                  <div className="flex gap-2 bg-neutral-900 p-1 rounded-lg border border-white/5">
                    <button className="px-6 py-2 rounded-md bg-neutral-800 text-[10px] font-bold text-zinc-400 border border-white/5 uppercase tracking-widest transition-all">
                      Mensal
                    </button>
                    <button className="px-6 py-2 rounded-md bg-gold-600 text-[10px] font-bold text-black uppercase tracking-widest transition-all">
                      Semanal
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-[#141414] border border-white/5 p-16 rounded-lg flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] uppercase mb-8">Lucro da Semana</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold text-white">R$</span>
                      <h2 className="text-8xl font-black text-gold-600 tracking-tighter leading-none">{totalRevenue.toFixed(0)}</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Cortes na Semana', value: '0', icon: Calendar },
                      { label: 'Lucro do Mês', value: `R$ 0.00`, icon: DollarSign },
                      { label: 'Novos (Mês)', value: '+0', icon: Users },
                      { label: 'Total de Clientes', value: '0', icon: TrendingUp },
                    ].map((stat, i) => (
                      <div key={i} className="bg-[#141414] border border-white/5 p-8 rounded-lg hover:bg-white/[0.02] transition-colors group">
                        <div className="w-10 h-10 rounded bg-black border border-white/5 flex items-center justify-center mb-6 group-hover:border-gold-600/30 transition-colors">
                          <stat.icon size={18} className="text-gold-600" />
                        </div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
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
