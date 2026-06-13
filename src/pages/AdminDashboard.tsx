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
      
      {/* Sidebar - Sutil & Elegante */}
      <aside className="w-72 bg-[#0A0A0A] border-r border-zinc-800/40 flex flex-col h-screen sticky top-0 shrink-0 z-20">
        <div className="p-8 border-b border-zinc-800/30">
          <div className="flex items-center space-x-3 mb-10 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 border border-zinc-800 flex items-center justify-center bg-black/40">
              <Scissors className="text-gold-600 w-5 h-5 group-hover:rotate-12 transition-transform duration-500" />
            </div>
            <span className="text-sm font-serif font-black tracking-[0.3em] uppercase">Black Diamond</span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] mb-2 block">Central de Comando</span>
            <h2 className="text-[11px] font-sans font-bold text-zinc-300 uppercase tracking-widest">Admin — Tatiano Silva</h2>
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
              className={`w-full flex items-center space-x-4 p-4 rounded-lg transition-all duration-500 group ${
                activeTab === item.id 
                ? 'bg-white/[0.03] border-l-2 border-[#C5A059] text-[#C5A059]' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.01]'
              }`}
            >
              <item.icon size={16} className={activeTab === item.id ? 'text-[#C5A059]' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-zinc-800/30">
           <button 
             onClick={() => navigate('/')}
             className="w-full flex items-center space-x-3 p-4 text-zinc-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em] group"
           >
             <AlertCircle size={16} className="group-hover:text-gold-600 transition-colors" />
             <span>Sair do Painel</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen custom-scrollbar bg-[#09090B] p-12 lg:p-16">
        
        {activeTab === 'agenda' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            <div className="flex justify-between items-center mb-16">
              <div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2 uppercase tracking-tighter">Agenda do Dia</h1>
                <div className="flex items-center space-x-3 text-[#C5A059]">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
              </div>
              <button className="flex items-center space-x-3 bg-[#C5A059] text-black px-10 py-4 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[#D4AF37] transition-all duration-500 shadow-2xl">
                <Plus size={16} />
                <span>Novo Corte</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Agenda List */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#121212] border border-zinc-800/60 rounded-xl overflow-hidden">
                  <div className="p-6 bg-white/[0.02] border-b border-zinc-800/40">
                    <h3 className="text-[10px] text-zinc-500 font-black tracking-[0.4em] uppercase">Horários & Disponibilidade</h3>
                  </div>
                  <div className="divide-y divide-zinc-800/40">
                    {timeSlots.map((time) => {
                      const booking = todayBookings.find(b => b.booking_time.slice(0, 5) === time);
                      return (
                        <div 
                          key={time} 
                          className="group p-6 flex items-center justify-between transition-all duration-500 hover:bg-white/[0.01]"
                        >
                          <div className="flex items-center space-x-10">
                            <span className={`text-xl font-serif font-medium w-16 ${booking ? 'text-white' : 'text-zinc-700 group-hover:text-zinc-500 transition-colors'}`}>{time}</span>
                            {booking ? (
                              <div className="flex flex-col">
                                <p className="text-[13px] font-bold text-zinc-100 uppercase tracking-widest">{booking.clients?.name}</p>
                                <span className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.2em] mt-1 flex items-center">
                                  <div className="w-1 h-1 rounded-full bg-[#C5A059] mr-2 animate-pulse" />
                                  Atendimento Confirmado
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-800 font-bold uppercase tracking-[0.3em] group-hover:text-zinc-700 transition-colors">Vago</span>
                            )}
                          </div>
                          
                          {booking ? (
                            <div className="px-5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-300 tracking-widest uppercase">
                              R$ {Number(booking.total_price).toFixed(0)}
                            </div>
                          ) : (
                            <div className="text-[#C5A059]/20 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                              Reservar
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Side Cards */}
              <div className="space-y-8">
                <div className="bg-[#121212] border border-zinc-800/60 p-10 rounded-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] opacity-[0.02] rounded-full blur-3xl -mr-16 -mt-16" />
                  <p className="text-[9px] text-zinc-600 font-black tracking-[0.3em] uppercase mb-6">Lucro Esperado Hoje</p>
                  <div className="flex items-baseline space-x-2 mb-2">
                    <span className="text-[#C5A059] text-5xl font-serif font-bold tracking-tighter">R$ {todayRevenue.toFixed(0)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{todayBookings.length} agendamentos totais</p>
                </div>

                <div className="bg-[#121212] border border-[#C5A059]/20 p-10 rounded-xl relative overflow-hidden group">
                  <p className="text-[9px] text-zinc-600 font-black tracking-[0.3em] uppercase mb-6">Disponibilidade</p>
                  <p className="text-zinc-200 text-4xl font-serif font-bold mb-2 uppercase tracking-tighter">{availableSlots} Vagas Livres</p>
                  <div className="flex items-center space-x-2 mt-4">
                    <div className="h-[2px] flex-1 bg-zinc-800 overflow-hidden">
                       <div className="h-full bg-[#C5A059]" style={{ width: `${(availableSlots/21)*100}%` }} />
                    </div>
                  </div>
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
             <div className="mb-20 text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-3 uppercase tracking-tighter">Faturamento</h1>
                <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.4em]">Relatório financeiro e métricas de desempenho.</p>
             </div>

             <div className="grid grid-cols-1 gap-12">
                <div className="bg-[#121212] border border-zinc-800/60 rounded-xl p-16 flex flex-col items-center justify-center text-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.03)_0%,transparent_70%)]" />
                   <p className="text-[10px] text-zinc-600 font-black tracking-[0.5em] uppercase mb-10 relative z-10">Lucro Acumulado</p>
                   <h2 className="text-7xl md:text-9xl font-serif font-bold text-[#C5A059] tracking-tighter relative z-10 drop-shadow-2xl">R$ {bookings.reduce((sum, b) => sum + Number(b.total_price), 0).toFixed(0)}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {[
                     { label: 'Cortes na Semana', value: todayBookings.length, detail: 'Atendimentos' },
                     { label: 'Lucro do Mês', value: `R$ ${todayRevenue.toFixed(0)}`, detail: 'Faturamento Bruto' },
                     { label: 'Novos Clientes', value: '+0', detail: 'Este Período' },
                     { label: 'Base de Dados', value: '1', detail: 'Clientes Totais' },
                   ].map((stat, i) => (
                     <div key={i} className="bg-[#121212] border border-zinc-800/60 p-10 rounded-xl hover:border-[#C5A059]/20 transition-all duration-500 group">
                        <p className="text-[9px] text-zinc-600 font-black tracking-[0.3em] uppercase mb-8 group-hover:text-zinc-500 transition-colors">{stat.label}</p>
                        <p className="text-3xl font-serif font-bold text-zinc-200 mb-2 uppercase tracking-tight">{stat.value}</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{stat.detail}</p>
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
             <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                <div>
                  <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Meus Clientes</h1>
                  <div className="px-5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-[9px] font-black text-zinc-500 uppercase tracking-widest inline-block">
                    1 Cliente Registrado
                  </div>
                </div>
                <button className="flex items-center space-x-3 border border-zinc-800 text-zinc-400 px-10 py-5 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all rounded-none">
                  <MessageSquare size={16} />
                  <span>Notificar Todos</span>
                </button>
             </div>

             <div className="bg-[#121212] border border-zinc-800/60 p-6 rounded-xl mb-12 shadow-xl">
                <div className="relative">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700" size={20} />
                   <input 
                     type="text" 
                     placeholder="Buscar cliente na base..."
                     className="w-full bg-zinc-950 border border-zinc-900 rounded-lg p-6 pl-16 outline-none focus:border-[#C5A059]/30 transition-all font-sans text-sm tracking-wide text-white placeholder:text-zinc-800"
                   />
                </div>
             </div>

             <div className="bg-[#121212] border border-zinc-800/60 rounded-xl p-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-zinc-950 rounded-full flex items-center justify-center mb-8 border border-zinc-900">
                   <Users size={32} className="text-zinc-800" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700">Aguardando novos registros para exibição.</p>
             </div>
          </motion.div>
        )}

        {activeTab === 'semanal' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
             <div className="mb-20">
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-3 uppercase tracking-tighter">Agenda Semanal</h1>
                <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.4em]">Visão panorâmica da escala de atendimentos.</p>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                {[
                  { d: 'SEG', n: '08' }, { d: 'TER', n: '09' }, { d: 'QUA', n: '10' },
                  { d: 'QUI', n: '11', current: true }, { d: 'SEX', n: '12' }, { d: 'SÁB', n: '13' }
                ].map((day, i) => (
                  <div 
                    key={i} 
                    className={`p-10 border transition-all duration-700 flex flex-col items-center justify-center rounded-xl ${
                      day.current 
                      ? 'bg-[#121212] border-[#C5A059] text-[#C5A059] shadow-[0_0_40px_rgba(197,160,89,0.05)]' 
                      : 'bg-zinc-900/20 border-zinc-800/40 text-zinc-600 opacity-40 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase mb-6">{day.d}</span>
                    <span className="text-5xl font-serif font-bold tracking-tighter">{day.n}</span>
                  </div>
                ))}
              </div>

              <div className="mt-32 p-20 border border-zinc-800/40 bg-[#121212]/30 rounded-xl text-center border-dashed">
                 <p className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.5em]">Selecione um dia para expandir o relatório detalhado.</p>
              </div>
          </motion.div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
