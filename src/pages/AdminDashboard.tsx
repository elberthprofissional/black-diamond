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
    <div className="min-h-screen bg-[#09090B] text-white flex overflow-hidden font-sans">
      
      {/* Sidebar - Sutileza Extrema */}
      <aside className="w-80 bg-[#0A0A0A] border-r border-zinc-800/40 flex flex-col h-screen sticky top-0 shrink-0 z-20">
        <div className="p-10 border-b border-zinc-800/30">
          <div className="flex items-center space-x-3 mb-10 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 border border-zinc-800 flex items-center justify-center bg-black/40">
              <Scissors className="text-[#C5A059] w-5 h-5 group-hover:rotate-12 transition-transform duration-500" />
            </div>
            <span className="text-sm font-serif font-black tracking-[0.3em] uppercase">Black Diamond</span>
          </div>

          <div className="space-y-1">
            <span className="text-[8px] text-zinc-500 font-black uppercase tracking-[0.6em] block">Central de Comando</span>
            <h2 className="text-[10px] font-sans font-bold text-zinc-400 uppercase tracking-[0.3em]">Admin — Tatiano Silva</h2>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'agenda', label: 'Agenda do Dia', icon: Calendar },
            { id: 'faturamento', label: 'Faturamento', icon: DollarSign },
            { id: 'clientes', label: 'Meus Clientes', icon: Users },
            { id: 'semanal', label: 'Visão Semanal', icon: Clock },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 p-4 rounded-none transition-all duration-500 group ${
                activeTab === item.id 
                ? 'bg-zinc-900/50 border-l-2 border-[#C5A059] text-[#C5A059]' 
                : 'text-zinc-600 hover:text-zinc-300'
              }`}
            >
              <item.icon size={16} className={activeTab === item.id ? 'text-[#C5A059]' : 'text-zinc-700 group-hover:text-zinc-500 transition-colors'} />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-zinc-800/30">
           <button 
             onClick={() => navigate('/')}
             className="w-full flex items-center space-x-3 p-4 text-zinc-700 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.5em] group"
           >
             <AlertCircle size={16} className="group-hover:text-[#C5A059] transition-colors" />
             <span>Sair do Painel</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen custom-scrollbar bg-[#09090B] p-12 lg:p-20">
        
        {activeTab === 'agenda' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            <div className="flex justify-between items-center mb-20">
              <div>
                <h1 className="text-5xl font-serif font-bold text-white mb-2 uppercase tracking-tighter">Agenda do Dia</h1>
                <div className="flex items-center space-x-3 text-[#C5A059]">
                  <span className="text-[10px] font-black uppercase tracking-[0.5em]">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
              </div>
              <button className="flex items-center space-x-3 bg-[#C5A059] text-black px-10 py-5 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-[#D4AF37] transition-all duration-500 shadow-2xl rounded-none">
                <Plus size={16} />
                <span>Novo Corte</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              {/* Agenda List */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-zinc-800/60 flex justify-between items-center bg-white/[0.01]">
                    <h3 className="text-[10px] text-zinc-500 font-black tracking-[0.5em] uppercase">Horários Disponíveis</h3>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{timeSlots.length} Slots Totais</span>
                  </div>
                  <div className="divide-y divide-zinc-800/40">
                    {timeSlots.map((time) => {
                      const booking = todayBookings.find(b => b.booking_time.slice(0, 5) === time);
                      return (
                        <div 
                          key={time} 
                          className="group p-8 flex items-center justify-between transition-all duration-500 hover:bg-white/[0.01]"
                        >
                          <div className="flex items-center space-x-12">
                            <span className={`text-2xl font-serif font-medium w-20 ${booking ? 'text-white' : 'text-zinc-800 group-hover:text-zinc-600 transition-colors'}`}>{time}</span>
                            {booking ? (
                              <div className="flex flex-col">
                                <p className="text-sm font-bold text-zinc-200 uppercase tracking-widest">{booking.clients?.name}</p>
                                <span className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.3em] mt-1.5 flex items-center">
                                  <div className="w-1 h-1 rounded-full bg-[#C5A059] mr-2 animate-pulse" />
                                  Confirmado
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-800 font-black uppercase tracking-[0.4em] group-hover:text-zinc-700 transition-colors">Disponível</span>
                            )}
                          </div>
                          
                          {booking ? (
                            <div className="px-6 py-2.5 bg-zinc-950 border border-zinc-800 rounded-md text-[10px] font-black text-zinc-400 tracking-widest uppercase">
                              R$ {Number(booking.total_price).toFixed(0)}
                            </div>
                          ) : (
                            <button className="text-[#C5A059]/20 text-[9px] font-black uppercase tracking-[0.5em] opacity-0 group-hover:opacity-100 transition-all hover:text-[#C5A059]">
                              Reservar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Side Cards */}
              <div className="space-y-10">
                <div className="bg-[#121212] border border-zinc-800 p-12 rounded-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] opacity-[0.02] rounded-full blur-3xl -mr-16 -mt-16" />
                  <p className="text-[10px] text-zinc-600 font-black tracking-[0.4em] uppercase mb-8">Lucro de Hoje</p>
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="text-[#C5A059] text-5xl font-serif font-bold tracking-tighter">R$ {todayRevenue.toFixed(0)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">{todayBookings.length} cortes</p>
                </div>

                <div className="bg-[#121212] border border-zinc-800 p-12 rounded-xl relative overflow-hidden group">
                  <p className="text-[10px] text-zinc-600 font-black tracking-[0.4em] uppercase mb-8 text-shadow-glow">Vagas Livres</p>
                  <p className="text-white text-5xl font-serif font-bold mb-3 tracking-tighter uppercase leading-none">{availableSlots}</p>
                  <p className="text-[#C5A059] text-[9px] font-black uppercase tracking-[0.5em]">Destaque do Dia</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'faturamento' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
             <div className="mb-24 text-center md:text-left">
                <h1 className="text-5xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Faturamento</h1>
                <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.5em]">Acompanhe o lucro da sua barbearia.</p>
             </div>

             <div className="grid grid-cols-1 gap-16">
                <div className="bg-[#121212] border border-zinc-800 rounded-xl p-20 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.04)_0%,transparent_70%)]" />
                   <p className="text-[11px] text-zinc-600 font-black tracking-[0.6em] uppercase mb-12 relative z-10">Lucro Acumulado</p>
                   <h2 className="text-8xl md:text-[10rem] font-serif font-bold text-[#C5A059] tracking-tighter relative z-10 drop-shadow-2xl">R$ {bookings.reduce((sum, b) => sum + Number(b.total_price), 0).toFixed(0)}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   {[
                     { label: 'Cortes na Semana', value: todayBookings.length, detail: '(Cortes)' },
                     { label: 'Lucro do Mês', value: `R$ ${todayRevenue.toFixed(0)}`, detail: '(Faturamento)' },
                     { label: 'Novos (Mês)', value: '+0', detail: '(Clientes)' },
                     { label: 'Total de Clientes', value: '1', detail: '(Base)' },
                   ].map((stat, i) => (
                     <div key={i} className="bg-[#121212] border border-zinc-800 p-12 rounded-xl hover:border-[#C5A059]/30 transition-all duration-700 group">
                        <p className="text-[10px] text-zinc-600 font-black tracking-[0.4em] uppercase mb-10 group-hover:text-zinc-500 transition-colors">{stat.label}</p>
                        <p className="text-4xl font-serif font-bold text-zinc-200 mb-2 tracking-tighter uppercase">{stat.value}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em]">{stat.detail}</p>
                     </div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'clientes' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
             <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-10">
                <div>
                  <h1 className="text-5xl font-serif font-bold text-white mb-6 uppercase tracking-tighter">Meus Clientes</h1>
                  <div className="px-6 py-2 bg-zinc-950 border border-zinc-800 rounded-full text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] inline-block">
                    1 Cliente no Total
                  </div>
                </div>
                <button className="flex items-center space-x-4 border border-zinc-800 text-zinc-500 px-12 py-6 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all rounded-none">
                  <MessageSquare size={16} />
                  <span>Enviar p/ Todos</span>
                </button>
             </div>

             <div className="bg-[#121212] border border-zinc-800 p-8 rounded-xl mb-16 shadow-2xl">
                <div className="relative">
                   <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-zinc-700" size={20} />
                   <input 
                     type="text" 
                     placeholder="Buscar cliente..."
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-8 pl-20 outline-none focus:border-[#C5A059]/30 transition-all font-sans text-sm tracking-widest text-white placeholder:text-zinc-800 uppercase"
                   />
                </div>
             </div>

             <div className="bg-[#121212] border border-zinc-800 rounded-xl p-32 flex flex-col items-center justify-center text-center opacity-30">
                <Users size={48} className="text-zinc-800 mb-10" />
                <p className="text-[11px] font-black uppercase tracking-[0.8em] text-zinc-700">Base de dados limpa.</p>
             </div>
          </motion.div>
        )}

        {activeTab === 'semanal' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
             <div className="mb-24">
                <h1 className="text-5xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Visão Semanal</h1>
                <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.5em]">Escala panorâmica de atendimentos.</p>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
                {[
                  { d: 'SEG', n: '08' }, { d: 'TER', n: '09' }, { d: 'QUA', n: '10' },
                  { d: 'QUI', n: '11', current: true }, { d: 'SEX', n: '12' }, { d: 'SÁB', n: '13' }
                ].map((day, i) => (
                  <div 
                    key={i} 
                    className={`p-12 border transition-all duration-700 flex flex-col items-center justify-center rounded-xl ${
                      day.current 
                      ? 'bg-[#121212] border-[#C5A059] text-[#C5A059] shadow-[0_0_50px_rgba(197,160,89,0.08)] scale-110' 
                      : 'bg-zinc-900/10 border-zinc-800/40 text-zinc-700 opacity-40 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px] font-black tracking-[0.4em] uppercase mb-8">{day.d}</span>
                    <span className="text-6xl font-serif font-bold tracking-tighter leading-none">{day.n}</span>
                  </div>
                ))}
              </div>

              <div className="mt-40 p-20 border border-zinc-800/60 bg-[#121212]/20 rounded-xl text-center border-dashed">
                 <p className="text-[11px] text-zinc-800 font-black uppercase tracking-[1em] opacity-50">Selecione um dia para expandir.</p>
              </div>
          </motion.div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
