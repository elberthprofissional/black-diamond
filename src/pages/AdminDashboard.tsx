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
    <div className="min-h-screen bg-[#09090B] text-white flex p-4 md:p-6 lg:p-8 font-sans gap-8">
      
      {/* Sidebar - Floating Card */}
      <aside className="w-80 bg-[#0A0A0A] border border-white/[0.03] flex flex-col h-[calc(100vh-4rem)] sticky top-8 shrink-0 z-20 rounded-[2.5rem] shadow-2xl">
        <div className="p-10">
          <div className="flex items-center space-x-4 mb-16 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 rounded-2xl border border-white/5 flex items-center justify-center bg-zinc-900 shadow-inner group-hover:border-gold-600/20 transition-all duration-500">
              <Scissors className="text-[#C5A059] w-6 h-6 group-hover:rotate-12 transition-transform duration-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-serif font-black tracking-[0.3em] uppercase leading-none text-white">Black Diamond</span>
              <span className="text-[8px] tracking-[0.5em] text-zinc-600 uppercase font-bold mt-1.5">Management</span>
            </div>
          </div>

          <div className="space-y-1 mb-12 px-2 border-l border-gold-600/20">
            <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.6em] block mb-2 opacity-50">Control Suite</span>
            <h2 className="text-[11px] font-sans font-bold text-zinc-400 uppercase tracking-widest leading-none">Tatiano Silva</h2>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-3 overflow-y-auto custom-scrollbar">
          {[
            { id: 'agenda', label: 'Agenda', icon: Calendar },
            { id: 'faturamento', label: 'Faturamento', icon: DollarSign },
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'semanal', label: 'Calendário', icon: Clock },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-5 p-5 transition-all duration-700 rounded-2xl group ${
                activeTab === item.id 
                ? 'bg-white/[0.04] text-[#C5A059]' 
                : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-[#C5A059]' : 'text-zinc-700 group-hover:text-zinc-500 transition-colors'} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] leading-none">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-10">
           <button 
             onClick={() => navigate('/')}
             className="w-full flex items-center justify-center space-x-3 p-5 text-zinc-700 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.4em] border border-white/5 rounded-full hover:bg-zinc-900"
           >
             <AlertCircle size={14} />
             <span>Sair da Sessão</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area - Infinite Background (Transparent/Matching Body) */}
      <main className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar relative px-4">
        
        {activeTab === 'agenda' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
              <div>
                <h1 className="text-6xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Agenda</h1>
                <span className="text-[10px] font-sans font-bold text-zinc-600 uppercase tracking-[0.6em]">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <button className="flex items-center space-x-4 bg-white text-black px-12 py-5 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-gold-600 transition-all duration-700 rounded-full shadow-[0_20px_50px_rgba(255,255,255,0.05)]">
                <Plus size={18} />
                <span>Novo Registro</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Agenda List */}
              <div className="lg:col-span-8 space-y-4">
                {timeSlots.map((time) => {
                  const booking = todayBookings.find(b => b.booking_time.slice(0, 5) === time);
                  return (
                    <div 
                      key={time} 
                      className={`group p-10 flex items-center justify-between transition-all duration-700 rounded-[2.5rem] ${
                        booking 
                        ? 'bg-[#121212] border border-zinc-800/40 shadow-xl' 
                        : 'bg-transparent border border-white/[0.02] hover:border-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-14">
                        <span className={`text-4xl font-serif font-light w-24 tracking-tighter ${booking ? 'text-white' : 'text-zinc-900 group-hover:text-zinc-800 transition-colors'}`}>{time}</span>
                        {booking ? (
                          <div className="flex flex-col">
                            <p className="text-[15px] font-bold text-zinc-200 uppercase tracking-widest leading-none">{booking.clients?.name}</p>
                            <span className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.5em] mt-3 opacity-80">Experiência Confirmada</span>
                          </div>
                        ) : (
                          <div className="h-px w-12 bg-zinc-900" />
                        )}
                      </div>
                      
                      {booking ? (
                        <div className="px-8 py-3 bg-zinc-950 border border-zinc-800 rounded-full text-[10px] font-black text-zinc-500 tracking-widest uppercase">
                          R$ {Number(booking.total_price).toFixed(0)}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-900 font-black uppercase tracking-[0.5em] opacity-0 group-hover:opacity-100 transition-opacity uppercase">Disponível</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Side Metric Cards */}
              <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#121212] border border-zinc-800/50 p-14 rounded-[3rem] relative overflow-hidden shadow-2xl">
                  <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.5em] mb-12 block leading-none">Lucro Bruto Hoje</span>
                  <span className="text-[#C5A059] text-7xl font-serif font-bold tracking-tighter block mb-4">R$ {todayRevenue.toFixed(0)}</span>
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-[0.3em] opacity-60">{todayBookings.length} Atendimentos</p>
                </div>

                <div className="bg-[#121212] border border-zinc-800/50 p-14 rounded-[3rem] relative overflow-hidden">
                  <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.5em] mb-12 block leading-none">Status Capacidade</span>
                  <p className="text-white text-6xl font-serif font-bold mb-4 tracking-tighter uppercase leading-none">{availableSlots}</p>
                  <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.5em]">Slots Disponíveis</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'faturamento' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
             <div className="mb-24">
                <h1 className="text-6xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Financeiro</h1>
                <span className="text-[10px] font-sans font-bold text-zinc-600 uppercase tracking-[0.6em]">Métricas de Desempenho Bruto</span>
             </div>

             <div className="space-y-10">
                {/* Main Card */}
                <div className="bg-[#121212] border border-zinc-800/50 rounded-[4rem] p-24 md:p-32 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.05)_0%,transparent_75%)]" />
                   <span className="text-[11px] text-zinc-600 font-black tracking-[0.8em] uppercase mb-16 relative z-10 opacity-40">Lucro Acumulado Total</span>
                   <h2 className="text-8xl md:text-[12rem] font-serif font-bold text-[#C5A059] tracking-tighter relative z-10 leading-none drop-shadow-2xl">R$ {bookings.reduce((sum, b) => sum + Number(b.total_price), 0).toFixed(0)}</h2>
                </div>

                {/* Grid Corrected */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   {[
                     { label: 'Cortes/Semana', value: todayBookings.length, detail: 'Atendimentos' },
                     { label: 'Lucro/Mês Corrente', value: `R$ ${todayRevenue.toFixed(0)}`, detail: 'Bruto' },
                     { label: 'Novos Leads', value: '+0', detail: 'Conquistas' },
                     { label: 'Base Total', value: '1', detail: 'Fidelizados' },
                   ].map((stat, i) => (
                     <div key={i} className="bg-[#121212] border border-zinc-800/50 p-12 rounded-[2.5rem] transition-all duration-700 group">
                        <span className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.5em] mb-12 block group-hover:text-zinc-500 transition-colors">{stat.label}</span>
                        <p className="text-4xl font-serif font-bold text-zinc-100 uppercase tracking-tighter leading-none mb-3">{stat.value}</p>
                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.4em]">{stat.detail}</p>
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
            className="max-w-6xl mx-auto"
          >
             <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12">
                <div>
                  <h1 className="text-6xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Clientes</h1>
                  <span className="text-[10px] font-sans font-bold text-zinc-700 uppercase tracking-[0.8em]">Base de Dados Consolidada</span>
                </div>
                <button className="flex items-center space-x-6 border border-zinc-800 text-zinc-500 px-14 py-6 font-black text-[10px] uppercase tracking-[0.5em] hover:bg-white hover:text-black transition-all rounded-full">
                  <MessageSquare size={18} />
                  <span>Notificar Todos</span>
                </button>
             </div>

             <div className="bg-[#121212] border border-zinc-800/50 rounded-[3rem] p-10 mb-20 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 group">
                   <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-[#C5A059] transition-all duration-500" size={24} />
                   <input 
                     type="text" 
                     placeholder="PESQUISAR CLIENTE..."
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-full p-10 pl-28 outline-none focus:border-white/10 transition-all font-sans text-sm tracking-[0.3em] text-white placeholder:text-zinc-900 uppercase font-black"
                   />
                </div>
             </div>

             <div className="bg-[#121212] border border-zinc-800/40 rounded-[4rem] p-40 flex flex-col items-center justify-center text-center opacity-20 border-dashed">
                <Users size={80} strokeWidth={0.5} className="text-zinc-600 mb-12" />
                <p className="text-[12px] font-black uppercase tracking-[1.2em] text-zinc-800">Sincronizando Base...</p>
             </div>
          </motion.div>
        )}

        {activeTab === 'semanal' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
             <div className="mb-24">
                <h1 className="text-6xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Calendário</h1>
                <span className="text-[10px] font-sans font-bold text-zinc-600 uppercase tracking-[0.6em]">Escala Panorâmica</span>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-20">
                {[
                  { d: 'SEG', n: '08' }, { d: 'TER', n: '09' }, { d: 'QUA', n: '10' },
                  { d: 'QUI', n: '11', current: true }, { d: 'SEX', n: '12' }, { d: 'SÁB', n: '13' }
                ].map((day, i) => (
                  <div 
                    key={i} 
                    className={`h-80 border transition-all duration-1000 flex flex-col items-center justify-center rounded-[3rem] shadow-2xl ${
                      day.current 
                      ? 'bg-white text-black scale-105 shadow-[0_30px_80px_rgba(255,255,255,0.1)]' 
                      : 'bg-[#121212] border-zinc-800/50 text-zinc-700 opacity-40 hover:opacity-80 hover:scale-[1.02]'
                    }`}
                  >
                    <span className="text-[12px] font-black tracking-[0.5em] uppercase mb-10 leading-none">{day.d}</span>
                    <span className="text-7xl font-serif font-black tracking-tighter leading-none">{day.n}</span>
                  </div>
                ))}
              </div>

              <div className="p-20 border border-zinc-900 bg-[#121212]/40 rounded-[3rem] text-center border-dashed">
                 <span className="text-[11px] text-zinc-800 font-black uppercase tracking-[1.5em] opacity-40">Selecione para expandir</span>
              </div>
          </motion.div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
