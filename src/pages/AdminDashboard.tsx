import React, { useState, useEffect, useCallback } from 'react';
import { getBookings, getServices, updateBookingStatus } from '../lib/api';
import { Scissors, Calendar, Users, DollarSign, LogOut, Check, X, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Service } from '../types';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('agenda');
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsData, servicesData] = await Promise.all([
        getBookings(new Date().toISOString().split('T')[0]),
        getServices()
      ]);
      setBookings(bookingsData || []);
      setServices(servicesData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getServiceNames = (ids: string[]) => {
    return ids.map(id => services.find(s => s.id === id)?.name).join(', ');
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateBookingStatus(id, status);
      fetchData(); // Refresh list
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status.');
    }
  };

  const todayRevenue = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-dark-card border-r border-dark-border p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-10">
            <Scissors className="text-gold-600 w-8 h-8" />
            <span className="text-xl font-serif font-bold tracking-widest uppercase">Admin</span>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('agenda')}
              className={`w-full flex items-center space-x-3 p-4 rounded-sm transition-all ${activeTab === 'agenda' ? 'bg-gold-600 text-black font-bold' : 'text-gray-400 hover:bg-dark-border'}`}
            >
              <Calendar size={20} />
              <span>Agenda</span>
            </button>
            <button 
              onClick={() => setActiveTab('clientes')}
              className={`w-full flex items-center space-x-3 p-4 rounded-sm transition-all ${activeTab === 'clientes' ? 'bg-gold-600 text-black font-bold' : 'text-gray-400 hover:bg-dark-border'}`}
            >
              <Users size={20} />
              <span>Clientes</span>
            </button>
            <button 
              onClick={() => setActiveTab('financeiro')}
              className={`w-full flex items-center space-x-3 p-4 rounded-sm transition-all ${activeTab === 'financeiro' ? 'bg-gold-600 text-black font-bold' : 'text-gray-400 hover:bg-dark-border'}`}
            >
              <DollarSign size={20} />
              <span>Financeiro</span>
            </button>
          </nav>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="mt-10 flex items-center space-x-3 p-4 text-gray-500 hover:text-white transition-all"
        >
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold uppercase tracking-widest">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <p className="text-gray-500 font-light mt-1">Bem-vindo de volta, Black Diamond.</p>
          </div>
          <div className="bg-dark-card border border-dark-border p-2 rounded-full px-4 text-sm font-bold text-gold-600">
            HOJE: {new Date().toLocaleDateString('pt-BR')}
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Carregando dados...</div>
        ) : activeTab === 'agenda' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-dark-card border border-dark-border p-6">
                <p className="text-gray-500 text-sm uppercase tracking-widest mb-1">Hoje</p>
                <p className="text-3xl font-serif font-bold text-white">{bookings.length} Agendamentos</p>
              </div>
              <div className="bg-dark-card border border-dark-border p-6">
                <p className="text-gray-500 text-sm uppercase tracking-widest mb-1">A Confirmar</p>
                <p className="text-3xl font-serif font-bold text-gold-600">{pendingCount} Pendentes</p>
              </div>
              <div className="bg-dark-card border border-dark-border p-6">
                <p className="text-gray-500 text-sm uppercase tracking-widest mb-1">Receita Hoje</p>
                <p className="text-3xl font-serif font-bold text-white">R$ {todayRevenue.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <div className="w-2 h-2 bg-gold-600 rounded-full mr-3"></div>
                Atendimentos do Dia
              </h2>
              
              <div className="space-y-4">
                {bookings.length === 0 ? (
                  <p className="text-gray-500 italic">Nenhum agendamento para hoje.</p>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.id} className="bg-dark-card border border-dark-border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-6">
                        <div className="text-center bg-black border border-dark-border p-3 min-w-[80px]">
                          <p className="text-gold-600 font-bold text-xl">{booking.booking_time.slice(0, 5)}</p>
                          <p className="text-gray-500 text-xs uppercase tracking-widest">HOJE</p>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white">{booking.clients?.name}</h4>
                          <p className="text-gray-400 text-sm">{getServiceNames(booking.service_ids)}</p>
                          <div className="flex items-center text-gray-500 text-xs mt-1">
                            <Phone size={12} className="mr-1" /> {booking.clients?.phone}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-900/30 text-green-500' : 
                          booking.status === 'pending' ? 'bg-yellow-900/30 text-yellow-500' :
                          'bg-red-900/30 text-red-500'
                        }`}>
                          {booking.status === 'confirmed' ? 'Confirmado' : 
                           booking.status === 'pending' ? 'Pendente' : 'Cancelado'}
                        </div>
                        <div className="flex gap-2 ml-auto">
                          {booking.status === 'pending' && (
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                              className="p-2 border border-dark-border hover:bg-green-600 hover:text-white transition-all text-green-500"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          {booking.status !== 'cancelled' && (
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                              className="p-2 border border-dark-border hover:bg-red-600 hover:text-white transition-all text-red-500"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-dark-card border border-dark-border flex items-center justify-center rounded-full mb-6">
              <Scissors className="text-gray-600" size={40} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-white mb-2">Em breve</h2>
            <p className="text-gray-500">Esta funcionalidade estará disponível na próxima atualização.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
