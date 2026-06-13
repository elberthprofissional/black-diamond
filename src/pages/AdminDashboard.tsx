import React, { useState, useEffect, useCallback } from 'react';
import { getBookings } from '../lib/api';
import { 
  Scissors, 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  Plus, 
  Search,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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

  const availableSlots = 21 - todayBookings.length;

  const timeSlots = [
    "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", 
    "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", 
    "16:30", "17:00", "17:30", "18:00", "18:30"
  ];

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex overflow-hidden font-sans p-4 md:p-6 lg:p-8">
      
      {/* Sidebar - Floating & Organic */}
      <aside className="w-72 bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 flex flex-col h-[calc(100vh-3rem)] sticky top-6 shrink-0 z-20 rounded-[2rem] shadow-2xl">
        <div className="p-10">
          <div className="flex items-center space-x-4 mb-14 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center bg-black shadow-inner group-hover:border-gold-600/30 transition-all duration-500">
              <Scissors className="text-[#C5A059] w-6 h-6 group-hover:rotate-12 transition-transform duration-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-serif font-black tracking-[0.2em] uppercase leading-none">Black Diamond</span>
              <span className="text-[8px] tracking-[0.4em] text-zinc-600 uppercase font-bold mt-1">Management</span>
            </div>
          </div>

          <div className="space-y-1 mb-10 px-2">
            <span className="text-[8px] text-zinc-500 font-black uppercase tracking-[0.6em] block mb-2 opacity-50">Admin Panel</span>
            <h2 className="text-[11px] font-sans font-bold text-zinc-300 uppercase tracking-widest">Tatiano Silva</h2>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'agenda', label: 'Agenda', icon: Calendar },
            { id: 'faturamento', label: 'Faturamento', icon: DollarSign },
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'semanal', label: 'Calendário', icon: Clock },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-5 p-5 transition-all duration-700 rounded-3xl group ${
                activeTab === item.id 
                ? 'bg-white/[0.04] text-[#C5A059] shadow-[0_10px_30px_-10px_rgba(197,160,89,0.1)]' 
                : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.01]'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-[#C5A059]' : 'text-zinc-700 group-hover:text-zinc-500 transition-colors'} />
              <span className="text-[11px] font-bold uppercase tracking-[0.3em]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8">
           <button 
             onClick={() => navigate('/')}
             className="w-full flex items-center justify-center space-x-3 p-5 text-zinc-700 hover:text-red-900/60 transition-all text-[9px] font-black uppercase tracking-[0.5em] border border-white/5 rounded-3xl hover:bg-red-950/10"
           >
             <AlertCircle size={14} />
             <span>Sair</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-3rem)] custom-scrollbar px-8 md:px-16 lg:px-24 py-10">
        
        {activeTab === 'agenda' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl"
          >
            <div className="flex justify-between items-end mb-24">
              <div>
                <h1 className="text-6xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Agenda</h1>
                <div className="flex items-center space-x-3 text-zinc-500">
                  <span className="text-[10px] font-bold uppercase tracking-[0.6em]">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
              </div>
              <button className="flex items-center space-x-4 bg-white text-black px-12 py-5 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-[#C5A059] transition-all duration-700 rounded-full shadow-2xl">
                <Plus size={18} />
                <span>Novo Registro</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              {/* Agenda List - More minimalist */}
              <div className="lg:col-span-8 space-y-4">
                <div className="space-y-3">
                  {timeSlots.map((time) => {
                    const booking = todayBookings.find(b => b.booking_time.slice(0, 5) === time);
                    return (
                      <div 
                        key={time} 
                        className={`group p-8 flex items-center justify-between transition-all duration-700 rounded-3xl ${
                          booking 
                          ? 'bg-zinc-900/40 border border-white/5' 
                          : 'bg-transparent border border-white/[0.02] hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center space-x-12">
                          <span className={`text-3xl font-serif font-light w-24 ${booking ? 'text-white' : 'text-zinc-800 transition-colors'}`}>{time}</span>
                          {booking ? (
                            <div className="flex flex-col">
                              <p className="text-[14px] font-bold text-zinc-200 uppercase tracking-widest">{booking.clients?.name}</p>
                              <span className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.4em] mt-1.5 opacity-60">Agendado</span>
                            </div>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                          )}
                        </div>
                        
                        {booking ? (
                          <div className="px-6 py-2.5 bg-black border border-white/5 rounded-full text-[10px] font-black text-zinc-500 tracking-widest uppercase">
                            R$ {Number(booking.total_price).toFixed(0)}
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-900 font-black uppercase tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-opacity">Vago</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Side Cards - Floating style */}
              <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#121212] border border-white/5 p-12 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.4em] mb-10">Resultado Hoje</p>
                  <span className="text-[#C5A059] text-6xl font-serif font-bold tracking-tighter block mb-3">R$ {todayRevenue.toFixed(0)}</span>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">{todayBookings.length} Atendimentos</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-12 rounded-[2.5rem] relative overflow-hidden shadow-xl">
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em] mb-10">Status</p>
                  <p className="text-white text-5xl font-serif font-bold mb-4 tracking-tighter uppercase leading-none">{availableSlots}</p>
                  <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.4em]">Vagas Disponíveis</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'faturamento' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl"
          >
             <div className="mb-24">
                <h1 className="text-6xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Financeiro</h1>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.6em]">Métricas e desempenho bruto.</p>
             </div>

             <div className="grid grid-cols-1 gap-16">
                <div className="bg-[#0A0A0A] border border-white/5 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.03)_0%,transparent_70%)]" />
                   <p className="text-[11px] text-zinc-600 font-black tracking-[0.8em] uppercase mb-14 relative z-10 opacity-50">Acumulado Total</p>
                   <h2 className="text-8xl md:text-[11rem] font-serif font-bold text-[#C5A059] tracking-tighter relative z-10 leading-none">R$ {bookings.reduce((sum, b) => sum + Number(b.total_price), 0).toFixed(0)}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   {[
                     { label: 'Cortes/Semana', value: todayBookings.length },
                     { label: 'Lucro/Mês', value: `R$ ${todayRevenue.toFixed(0)}` },
                     { label: 'Novos Clientes', value: '+0' },
                     { label: 'Base Total', value: '1' },
                   ].map((stat, i) => (
                     <div key={i} className="bg-zinc-900/30 border border-white/5 p-12 rounded-[2rem] hover:bg-zinc-900/50 transition-all duration-700 group">
                        <p className="text-[9px] text-zinc-600 font-black tracking-[0.4em] uppercase mb-10 group-hover:text-zinc-500 transition-colors">{stat.label}</p>
                        <p className="text-4xl font-serif font-bold text-zinc-200 uppercase tracking-tighter leading-none">{stat.value}</p>
                     </div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'clientes' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl"
          >
             <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12">
                <div>
                  <h1 className="text-6xl font-serif font-bold text-white mb-6 uppercase tracking-tighter">Clientes</h1>
                  <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.8em]">Base de Dados Consolidada</span>
                </div>
                <button className="flex items-center space-x-5 border border-zinc-800 text-zinc-600 px-12 py-6 font-black text-[9px] uppercase tracking-[0.6em] hover:bg-white hover:text-black transition-all rounded-full">
                  <MessageSquare size={16} />
                  <span>Notificar Todos</span>
                </button>
             </div>

             <div className="relative mb-20 group">
                <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-[#C5A059] transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Pesquisar..."
                  className="w-full bg-[#121212] border border-white/5 rounded-[2.5rem] p-10 pl-24 outline-none focus:border-white/10 transition-all font-sans text-sm tracking-[0.2em] text-white placeholder:text-zinc-800 uppercase font-bold shadow-2xl"
                />
             </div>

             <div className="bg-[#121212] border border-white/[0.02] rounded-[3rem] p-32 flex flex-col items-center justify-center text-center opacity-20">
                <Users size={64} strokeWidth={1} className="text-zinc-600 mb-10" />
                <p className="text-[11px] font-black uppercase tracking-[1em] text-zinc-800">Sem registros recentes</p>
             </div>
          </motion.div>
        )}

        {activeTab === 'semanal' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl"
          >
             <div className="mb-24">
                <h1 className="text-6xl font-serif font-bold text-white mb-6 uppercase tracking-tighter">Calendário</h1>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.6em]">Planejamento da escala semanal.</p>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
                {[
                  { d: 'SEG', n: '08' }, { d: 'TER', n: '09' }, { d: 'QUA', n: '10' },
                  { d: 'QUI', n: '11', current: true }, { d: 'SEX', n: '12' }, { d: 'SÁB', n: '13' }
                ].map((day, i) => (
                  <div 
                    key={i} 
                    className={`p-14 border transition-all duration-1000 flex flex-col items-center justify-center rounded-[2.5rem] shadow-2xl ${
                      day.current 
                      ? 'bg-white text-black scale-110 shadow-[0_20px_50px_rgba(255,255,255,0.05)]' 
                      : 'bg-[#121212] border-white/5 text-zinc-700 opacity-40 hover:opacity-100 hover:border-white/10'
                    }`}
                  >
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase mb-8 leading-none">{day.d}</span>
                    <span className="text-6xl font-serif font-bold tracking-tighter leading-none">{day.n}</span>
                  </div>
                ))}
              </div>

              <div className="mt-40 p-24 border border-zinc-900 bg-[#0A0A0A] rounded-[3rem] text-center border-dashed">
                 <p className="text-[11px] text-zinc-800 font-black uppercase tracking-[1em] opacity-40">Aguardando seleção</p>
              </div>
          </motion.div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
