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
    <div className="min-h-screen bg-dark-pure text-white flex overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-80 bg-dark-card border-r border-white/5 flex flex-col h-screen sticky top-0 shrink-0">
        <div className="p-10 border-b border-white/5">
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-10 h-10 bg-gold-600 flex items-center justify-center">
              <Scissors className="text-black w-6 h-6" />
            </div>
            <span className="text-lg font-serif font-black tracking-widest uppercase">Admin</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase mb-4 block">Bem-vindo</span>
            <h2 className="text-sm font-serif font-bold text-white uppercase tracking-widest">Boa noite, Administrador</h2>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'agenda', label: 'Agenda', icon: Calendar },
            { id: 'faturamento', label: 'Faturamento', icon: DollarSign },
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'semanal', label: 'Agenda Semanal', icon: Clock },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 p-4 transition-all duration-300 group ${
                activeTab === item.id 
                ? 'bg-gold-600 text-black font-bold' 
                : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-black' : 'text-gold-600 group-hover:scale-110 transition-transform'} />
              <span className="text-[11px] uppercase tracking-[0.2em]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
           <button 
             onClick={() => navigate('/')}
             className="w-full flex items-center space-x-4 p-4 text-gray-500 hover:text-white transition-all text-[11px] uppercase tracking-[0.2em]"
           >
             <AlertCircle size={18} />
             <span>Issues</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen custom-scrollbar bg-dark-pure p-12 lg:p-20">
        
        {activeTab === 'agenda' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-16">
              <div>
                <h1 className="text-5xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Agenda do Dia</h1>
                <div className="flex items-center space-x-3 text-gold-600">
                  <Calendar size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em]">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
              </div>
              <button className="flex items-center space-x-3 bg-white text-black px-10 py-5 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-gold-600 transition-colors duration-500">
                <Plus size={16} />
                <span>Novo Corte</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Agenda List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-[10px] text-gray-500 font-bold tracking-[0.4em] uppercase mb-8">Horários Disponíveis</h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {timeSlots.map((time) => {
                    const booking = todayBookings.find(b => b.booking_time.slice(0, 5) === time);
                    return (
                      <div 
                        key={time} 
                        className={`group p-6 border flex items-center justify-between transition-all duration-500 ${
                          booking 
                          ? 'bg-dark-card border-white/5' 
                          : 'bg-dark-pure border-white/5 hover:border-gold-600/30'
                        }`}
                      >
                        <div className="flex items-center space-x-8">
                          <span className={`text-xl font-serif font-bold ${booking ? 'text-white' : 'text-gray-600'}`}>{time}</span>
                          {booking ? (
                            <div>
                              <p className="text-sm font-bold text-white uppercase tracking-widest">{booking.clients?.name}</p>
                              <p className="text-[10px] text-gold-600 uppercase tracking-widest mt-1">Serviço Confirmado</p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.3em]">Disponível</span>
                          )}
                        </div>
                        
                        {booking ? (
                          <div className="flex items-center space-x-3">
                             <div className="px-4 py-2 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                               R$ {Number(booking.total_price).toFixed(0)}
                             </div>
                          </div>
                        ) : (
                          <div className="px-4 py-2 bg-gold-600/10 text-gold-600 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Livre
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Side Cards */}
              <div className="space-y-8">
                <div className="bg-dark-card border border-white/5 p-10">
                  <p className="text-[10px] text-gray-500 font-bold tracking-[0.3em] uppercase mb-6">Lucro de Hoje</p>
                  <div className="flex items-baseline space-x-2 mb-2">
                    <span className="text-gold-600 text-4xl font-serif font-bold">R$ {todayRevenue.toFixed(0)}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{todayBookings.length} cortes realizados</p>
                </div>

                <div className="bg-dark-card border border-gold-600/20 p-10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold-600 opacity-5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:opacity-10 transition-opacity duration-700" />
                  <p className="text-[10px] text-gray-500 font-bold tracking-[0.3em] uppercase mb-6">Vagas para Hoje</p>
                  <p className="text-white text-4xl font-serif font-bold mb-2 uppercase tracking-tighter">{availableSlots} Vagas</p>
                  <p className="text-gold-600 text-[10px] font-black uppercase tracking-widest">Destaque do dia</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'faturamento' && (
          <div className="max-w-6xl mx-auto">
             <div className="mb-20">
                <h1 className="text-5xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Faturamento</h1>
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.4em]">Acompanhe o lucro da sua barbearia.</p>
             </div>

             <div className="grid grid-cols-1 gap-12">
                <div className="bg-dark-card border border-white/5 p-16 flex flex-col items-center justify-center text-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)]" />
                   <p className="text-[10px] text-gray-500 font-bold tracking-[0.5em] uppercase mb-8 relative z-10">Lucro Total do Período</p>
                   <h2 className="text-8xl font-serif font-bold text-gold-600 tracking-tighter relative z-10">R$ {bookings.reduce((sum, b) => sum + Number(b.total_price), 0).toFixed(2)}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {[
                     { label: 'Cortes na Semana', value: todayBookings.length, detail: '(Cortes)' },
                     { label: 'Lucro do Mês', value: `R$ ${todayRevenue.toFixed(2)}`, detail: '(Estimado)' },
                     { label: 'Novos (Mês)', value: '+0', detail: '(Clientes)' },
                     { label: 'Total de Clientes', value: '1', detail: '(Base)' },
                   ].map((stat, i) => (
                     <div key={i} className="bg-dark-card border border-white/5 p-10 hover:border-gold-600/20 transition-colors">
                        <p className="text-[9px] text-gray-500 font-bold tracking-[0.3em] uppercase mb-6">{stat.label}</p>
                        <p className="text-2xl font-serif font-bold text-white mb-1 uppercase tracking-tight">{stat.value}</p>
                        <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest">{stat.detail}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="max-w-6xl mx-auto">
             <div className="flex justify-between items-end mb-16">
                <div>
                  <h1 className="text-5xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Meus Clientes</h1>
                  <div className="px-4 py-1 bg-gold-600 text-black text-[9px] font-black uppercase tracking-widest inline-block">
                    (1 CLIENTES NO TOTAL)
                  </div>
                </div>
                <button className="flex items-center space-x-3 border border-white/10 text-white px-10 py-5 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all">
                  <MessageSquare size={16} />
                  <span>Enviar p/ Todos</span>
                </button>
             </div>

             <div className="bg-dark-card border border-white/5 p-8 mb-12">
                <div className="relative">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
                   <input 
                     type="text" 
                     placeholder="Buscar cliente..."
                     className="w-full bg-dark-pure border border-white/5 p-6 pl-16 outline-none focus:border-gold-600/50 transition-colors font-sans text-sm tracking-wide text-white"
                   />
                </div>
             </div>

             <div className="flex flex-col items-center justify-center py-40 text-center opacity-40">
                <Users size={64} className="text-gray-800 mb-8" />
                <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-gray-500">Nenhum cliente encontrado.</p>
             </div>
          </div>
        )}

        {activeTab === 'semanal' && (
          <div className="max-w-6xl mx-auto">
             <div className="mb-20">
                <h1 className="text-5xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Agenda Semanal</h1>
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.4em]">Visão panorâmica dos próximos dias.</p>
             </div>

             <div className="grid grid-cols-6 gap-4">
                {[
                  { d: 'SEG', n: '08' }, { d: 'TER', n: '09' }, { d: 'QUA', n: '10' },
                  { d: 'QUI', n: '11', current: true }, { d: 'SEX', n: '12' }, { d: 'SÁB', n: '13' }
                ].map((day, i) => (
                  <div 
                    key={i} 
                    className={`p-10 border transition-all duration-500 flex flex-col items-center ${
                      day.current 
                      ? 'bg-gold-600 border-gold-600 text-black scale-110 shadow-[0_0_40px_rgba(212,175,55,0.2)]' 
                      : 'bg-dark-card border-white/5 text-white opacity-40 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase mb-4">{day.d}</span>
                    <span className="text-4xl font-serif font-bold">{day.n}</span>
                  </div>
                ))}
              </div>

              <div className="mt-32 p-20 border border-white/5 bg-dark-card/30 text-center">
                 <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.5em]">Selecione um dia para visualizar os detalhes</p>
              </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
