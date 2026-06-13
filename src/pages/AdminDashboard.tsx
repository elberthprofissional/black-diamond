import React, { useState, useEffect, useCallback } from 'react';
import { getBookings } from '../lib/api';
import { 
  Scissors, 
  Calendar, 
  DollarSign, 
  Users, 
  Plus, 
  Search,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  LayoutDashboard,
  LogOut,
  ChevronRight
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

  const menuItems = [
    { id: 'agenda', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'semanal', label: 'Agenda Completa', icon: Calendar },
    { id: 'faturamento', label: 'Relatórios Financeiros', icon: TrendingUp },
    { id: 'clientes', label: 'Base de Clientes', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-400 font-sans selection:bg-gold-600/30">
      <div className="flex relative z-10">
        {/* Sidebar */}
        <aside className="w-64 h-screen sticky top-0 bg-[#0A0A0A] border-r border-white/5 flex flex-col hidden lg:flex">
          <div className="px-0 py-10">
            <div className="flex items-center gap-3 mb-12 group cursor-pointer px-8" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-gold-600 flex items-center justify-center rounded-md">
                <Scissors className="text-black w-4 h-4" />
              </div>
              <h1 className="text-white font-bold text-sm tracking-tight uppercase whitespace-nowrap">Black Diamond</h1>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-8 py-4 transition-all duration-200 border-l-2 ${
                    activeTab === item.id 
                    ? 'bg-white/5 text-gold-600 border-gold-600' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border-transparent'
                  }`}
                >
                  <item.icon size={20} className={activeTab === item.id ? 'text-gold-600' : 'text-zinc-600'} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-6 border-t border-white/5">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-500 hover:text-red-400 transition-all text-sm font-medium"
            >
              <LogOut size={18} />
              Sair do Painel
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-h-screen lg:px-12 px-6 py-10 overflow-x-hidden">
          {/* Top Bar */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{activeTab === 'agenda' ? 'Agenda do Dia' : activeTab === 'faturamento' ? 'Faturamento' : activeTab === 'clientes' ? 'Meus Clientes' : 'Agenda Semanal'}</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-md font-bold text-xs transition-all uppercase tracking-wide">
                <Plus size={16} />
                <span className="hidden sm:inline">Novo Corte</span>
              </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'agenda' && (
              <motion.div 
                key="agenda"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#141414] border border-white/5 p-8 rounded-lg relative overflow-hidden group">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-4">Receita Hoje</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">R$</span>
                      <span className="text-4xl font-bold text-gold-600">{todayRevenue.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="bg-[#141414] border border-white/5 p-8 rounded-lg relative overflow-hidden group">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-4">Atendimentos</span>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-white">{todayBookings.length}</span>
                      <span className="text-xs text-zinc-600 font-bold mb-1 uppercase">De 21 slots</span>
                    </div>
                  </div>

                  <div className="bg-[#141414] border border-white/5 p-8 rounded-lg relative overflow-hidden group">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-4">Disponíveis</span>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-white">{availableSlots}</span>
                      <span className="text-xs text-zinc-600 font-bold mb-1 uppercase">Hoje</span>
                    </div>
                  </div>
                </div>

                {/* Horários Disponíveis Grid */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">Horários Disponíveis</h3>
                    <span className="text-xs text-zinc-500 font-medium">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {timeSlots.map((time) => {
                      const booking = todayBookings.find(b => b.booking_time.slice(0, 5) === time);
                      return (
                        <div 
                          key={time} 
                          className={`p-4 rounded-md border flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                            booking 
                            ? 'bg-gold-600 border-gold-600' 
                            : 'bg-transparent border-white/10 hover:border-gold-600/50'
                          }`}
                        >
                          <span className={`text-lg font-bold ${booking ? 'text-black' : 'text-white'}`}>{time}</span>
                          {booking ? (
                            <span className="text-[10px] font-bold text-black/80 uppercase truncate w-full text-center">{booking.clients?.name}</span>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-600 uppercase">Livre</span>
                          )}
                        </div>
                      );
                    })}
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
                className="space-y-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Performance Financeira</h3>
                    <p className="text-xs text-zinc-600 font-medium">Dados consolidados do período</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-6 py-2 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest">Mensal</button>
                    <button className="px-6 py-2 rounded-md bg-gold-600 text-xs font-bold text-black uppercase tracking-widest">Semanal</button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-[#141414] border border-white/5 p-12 rounded-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-6">Receita Bruta Total</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-bold text-white">R$</span>
                      <h2 className="text-6xl md:text-8xl font-bold text-gold-600 tracking-tighter leading-none">{totalRevenue.toFixed(0)}</h2>
                    </div>
                    <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest mt-8">+24% vs mês anterior</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Ticket Médio', value: `R$ ${(totalRevenue / (bookings.length || 1)).toFixed(0)}`, icon: DollarSign },
                      { label: 'Cancelamentos', value: '4%', icon: AlertCircle },
                      { label: 'Novos Clientes', value: '12', icon: Users },
                      { label: 'Retenção', value: '88%', icon: TrendingUp },
                    ].map((stat, i) => (
                      <div key={i} className="bg-[#141414] border border-white/5 p-8 rounded-lg flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
                        <div className="w-10 h-10 rounded-md bg-black border border-white/5 flex items-center justify-center mb-6">
                          <stat.icon size={20} className="text-gold-600" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                          <p className="text-3xl font-bold text-white">{stat.value}</p>
                        </div>
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
                className="space-y-8"
              >
                <div className="bg-[#141414] border border-white/5 rounded-lg overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Base de Clientes</h3>
                    <div className="flex gap-4">
                       <button className="p-2.5 rounded-md bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all">
                          <MessageSquare size={18} />
                       </button>
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
                          <input 
                            type="text" 
                            placeholder="Buscar cliente..."
                            className="bg-black/20 border border-white/5 rounded-md py-2 pl-10 pr-4 outline-none text-xs text-white focus:border-gold-600/30 transition-all w-48 md:w-64"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.01]">
                          <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Cliente</th>
                          <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Contato</th>
                          <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">Última Visita</th>
                          <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Gasto Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {bookings.slice(0, 5).map((b, i) => (
                          <tr key={i} className="hover:bg-white/[0.01] transition-colors group cursor-pointer">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-md bg-black border border-white/10 flex items-center justify-center text-xs font-bold text-gold-600 uppercase">
                                  {b.clients?.name?.substring(0, 2)}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-zinc-200 uppercase tracking-tight">{b.clients?.name}</p>
                                  <p className="text-[10px] text-zinc-600 font-medium uppercase mt-0.5">Frequente</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className="text-xs text-zinc-500 font-medium">{b.clients?.phone}</span>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">12 JUN 2026</span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <span className="text-sm font-bold text-gold-600">R$ {Number(b.total_price).toFixed(0)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-6 border-t border-white/5 text-center">
                    <button className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">Ver Todos os Clientes</button>
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
                className="space-y-8"
              >
                 <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Agenda Semanal</h3>
                    <p className="text-xs text-zinc-600 font-medium">Escala panorâmica de atendimentos</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-md bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all">
                      <ChevronRight className="rotate-180" size={16} />
                    </button>
                    <button className="p-2 rounded-md bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

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

                <div className="p-20 border border-white/5 bg-[#141414] rounded-lg text-center border-dashed">
                  <Calendar size={32} className="mx-auto mb-4 text-zinc-800" />
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Selecione um dia para ver os detalhes</p>
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
