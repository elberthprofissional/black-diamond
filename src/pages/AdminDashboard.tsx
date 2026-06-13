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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

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
    <div className="min-h-screen bg-[#09090B] text-white flex p-6 font-sans gap-8 overflow-hidden">
      
      {/* Sidebar - Floating Web App Style */}
      <aside className="w-80 bg-[#0A0A0A] border border-white/[0.03] flex flex-col h-[calc(100vh-3rem)] sticky top-0 shrink-0 z-20 rounded-[2rem] shadow-2xl">
        <div className="p-10 border-b border-zinc-800/30">
          <div className="flex items-center space-x-3 mb-10 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 border border-white/10 flex items-center justify-center bg-zinc-950 shadow-inner group-hover:border-gold-600/20 transition-all duration-500 rounded-lg overflow-hidden">
              <img src="/assets/logo.webp" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <Scissors className="text-[#C5A059] w-5 h-5 absolute group-hover:rotate-12 transition-transform duration-500" style={{ display: 'none' }} id="admin-sidebar-fallback" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-serif font-black tracking-[0.2em] uppercase leading-none text-white">Black Diamond</span>
              <span className="text-[7px] tracking-[0.4em] text-zinc-600 uppercase font-bold mt-1.5">Management</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.6em] block mb-2 opacity-50">Controle</span>
            <h2 className="text-[10px] font-sans font-bold text-zinc-400 uppercase tracking-widest leading-none">{getGreeting()}, Tato</h2>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
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
                ? 'bg-zinc-900/40 text-[#C5A059]' 
                : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-[#C5A059]' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] leading-none">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8">
           <button 
             onClick={() => navigate('/')}
             className="w-full flex items-center justify-center space-x-3 p-5 text-zinc-700 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.4em] border border-white/5 rounded-xl hover:bg-zinc-900"
           >
             <AlertCircle size={14} />
             <span>Sair do Painel</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area - Infinite Background */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-3rem)] custom-scrollbar pr-4">
        
        {activeTab === 'agenda' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
              <div>
                <h1 className="text-6xl font-serif font-bold text-white mb-4 uppercase tracking-tighter leading-none text-shadow-glow">Agenda</h1>
                <span className="text-[10px] font-sans font-bold text-zinc-600 uppercase tracking-[0.6em]">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <button className="flex items-center space-x-4 bg-white text-black px-12 py-5 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-[#C5A059] transition-all duration-700 rounded-full shadow-2xl">
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
                      className={`group p-10 flex items-center justify-between transition-all duration-700 rounded-[2rem] ${
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
                            <span className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.5em] mt-3 opacity-80 uppercase">Confirmado</span>
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
                <div className="bg-[#121212] border border-zinc-800/50 p-12 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                  <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.5em] mb-12 block leading-none">Lucro Bruto Hoje</span>
                  <span className="text-[#C5A059] text-7xl font-serif font-bold tracking-tighter block mb-4 leading-none">R$ {todayRevenue.toFixed(0)}</span>
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-[0.3em] opacity-60">{todayBookings.length} Atendimentos</p>
                </div>

                <div className="bg-[#121212] border border-zinc-800/50 p-12 rounded-[2.5rem] relative overflow-hidden shadow-xl">
                  <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.5em] mb-12 block leading-none">Capacidade</span>
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
             {/* Cabeçalho */}
             <div className="mb-24">
                <h1 className="text-5xl font-serif font-bold text-white mb-3 uppercase tracking-tighter">Financeiro</h1>
                <p className="text-zinc-500 text-[10px] font-sans font-bold uppercase tracking-[0.2em]">Métricas de Desempenho Bruto</p>
             </div>

             <div className="space-y-12">
                {/* Card Gigante (Lucro Principal) */}
                <div className="bg-[#121212] border border-zinc-800/50 rounded-[2rem] p-24 md:p-32 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.03)_0%,transparent_70%)]" />
                   <span className="text-xs text-zinc-500 font-black tracking-widest uppercase mb-12 relative z-10">Lucro Acumulado Total</span>
                   <h2 className="text-7xl md:text-8xl font-serif font-bold text-[#C5A059] tracking-tighter relative z-10 drop-shadow-2xl">
                      R$ {bookings.reduce((sum, b) => sum + Number(b.total_price), 0).toFixed(2)}
                   </h2>
                </div>

                {/* Grid Inferior (4 Cards Menores) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {[
                     { label: 'Cortes na Semana', value: todayBookings.length },
                     { label: 'Lucro do Mês', value: `R$ ${todayRevenue.toFixed(0)}` },
                     { label: 'Novos (Mês)', value: '+0' },
                     { label: 'Total de Clientes', value: '1' },
                   ].map((stat, i) => (
                     <div key={i} className="bg-[#121212] border border-zinc-800/50 p-8 rounded-[2rem] transition-all duration-700 hover:border-[#C5A059]/20 shadow-xl group">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-10 block group-hover:text-zinc-400 transition-colors leading-none">{stat.label}</span>
                        <p className="text-4xl font-sans font-bold text-white tracking-tighter leading-none">{stat.value}</p>
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
             <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
                <div>
                  <h1 className="text-4xl font-serif font-bold text-white mb-3 uppercase tracking-tighter">Meus Clientes</h1>
                  <div className="px-3 py-1 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-md text-[9px] font-black text-[#C5A059] uppercase tracking-widest inline-block">
                    1 Cliente Registrado
                  </div>
                </div>
                <button className="flex items-center space-x-3 bg-white text-black px-10 py-4 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[#C5A059] transition-all duration-500 rounded-full shadow-lg">
                  <MessageSquare size={16} />
                  <span>Enviar p/ Todos</span>
                </button>
             </div>

             <div className="bg-[#121212] border border-zinc-800 rounded-[2rem] p-1 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-8 border-b border-zinc-800/40">
                   <div className="relative group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#C5A059] transition-all duration-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar cliente..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-5 pl-16 outline-none focus:border-[#C5A059]/30 transition-all font-sans text-xs tracking-widest text-white placeholder:text-zinc-700 uppercase"
                      />
                   </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-40 text-center opacity-40">
                   <p className="text-[11px] font-black uppercase tracking-[0.6em] text-zinc-500">Nenhum cliente encontrado.</p>
                </div>
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
                <h1 className="text-6xl font-serif font-bold text-white mb-4 uppercase tracking-tighter leading-none">Calendário</h1>
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
                 <span className="text-[11px] text-zinc-800 font-black uppercase tracking-[1.5em] opacity-40">Aguardando Seleção</span>
              </div>
          </motion.div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
