import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { getClients, getBookings } from '../lib/api';
import type { Client, Booking } from '../types';
import AdminSidebar from '../components/Admin/AdminSidebar';
import AdminNavbar from '../components/Admin/Navbar';
import BottomTabs from '../components/Admin/BottomTabs';
import { ArrowLeft, History as HistoryIcon, ChevronDown } from 'lucide-react';

const ClientVisits: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const months = [
    { label: 'Todos', value: null },
    { label: 'Jan', value: 0 },
    { label: 'Fev', value: 1 },
    { label: 'Mar', value: 2 },
    { label: 'Abr', value: 3 },
    { label: 'Mai', value: 4 },
    { label: 'Jun', value: 5 },
    { label: 'Jul', value: 6 },
    { label: 'Ago', value: 7 },
    { label: 'Set', value: 8 },
    { label: 'Out', value: 9 },
    { label: 'Nov', value: 10 },
    { label: 'Dez', value: 11 },
  ];

  const filteredHistory = history.filter(v => {
    const date = new Date(v.booking_date);
    return selectedMonth === null || date.getMonth() === selectedMonth;
  });

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [clientsData, bookingsData] = await Promise.all([
        getClients(),
        getBookings()
      ]);
      
      const foundClient = clientsData.find((c: Client) => c.id === id);
      if (!foundClient) {
        navigate('/admin');
        return;
      }
      setClient(foundClient);

      let clientBookings = bookingsData
        .filter((b: Booking) => b.client_id === id)
        .sort((a: Booking, b: Booking) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());

      setHistory(clientBookings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const handleClearHistory = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('bookings').delete().eq('client_id', id);
      if (error) throw error;
      setHistory([]);
      setShowConfirmModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (visitId: string) => {
    setExpandedId(prev => prev === visitId ? null : visitId);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-white/5 border-t-zinc-400 rounded-full animate-spin" />
    </div>
  );

  if (!client) return null;

  return (
    <div className="min-h-[100dvh] lg:min-h-screen bg-[#0A0A0A] text-zinc-400 font-sans selection:bg-[#C5A059]/30 tracking-tight flex overflow-hidden">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-[320px] flex flex-col min-h-[100dvh] lg:h-screen overflow-hidden">
        <AdminNavbar />

        {/* HEADER - DESKTOP */}
        <header className="hidden lg:flex items-center justify-between px-12 py-6 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/admin/cliente/${id}`)}
              className="text-zinc-500 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="w-px h-5 bg-white/[0.06]" />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight uppercase leading-none">{client.name}</h1>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Histórico de Visitas</p>
            </div>
          </div>
          <button 
            onClick={() => setShowConfirmModal(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
          >
            <HistoryIcon size={16} />
          </button>
        </header>

        {/* HEADER - MOBILE */}
        <header className="lg:hidden sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.03]">
          <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(`/admin/cliente/${id}`)}
                className="text-zinc-500 hover:text-white transition-colors active:scale-95 pr-2"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tighter leading-none">{client.name}</h1>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mt-1">Histórico de Visitas</p>
              </div>
            </div>
            <button 
              onClick={() => setShowConfirmModal(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900/50 text-zinc-700 hover:text-red-500 transition-all border border-white/[0.03]"
            >
              <HistoryIcon size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-12 py-6 lg:py-8 pb-32 lg:pb-8 scrollbar-hide">
          <div className="max-w-4xl mx-auto">
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* FILTRO DE MESES - MINIMALISTA */}
          <nav className="mb-12 overflow-x-auto no-scrollbar scrollbar-hide -mx-6 px-6">
            <div className="flex items-center gap-6">
              {months.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setSelectedMonth(m.value)}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap relative py-2 ${
                    selectedMonth === m.value ? 'text-[#C5A059]' : 'text-zinc-700 hover:text-zinc-400'
                  }`}
                >
                  {m.label}
                  {selectedMonth === m.value && (
                    <motion.div layoutId="monthActive" className="absolute -bottom-1 left-0 right-0 h-px bg-[#C5A059]" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* LISTA DE VISITAS COM EXPANSÃO */}
          <div className="space-y-3">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((v, i) => {
                const isExpanded = expandedId === (v.id || i);
                return (
                  <div 
                    key={v.id || i}
                    className={`rounded-[24px] border transition-all overflow-hidden cursor-pointer ${
                      isExpanded 
                        ? 'bg-zinc-900/30 border-white/[0.08]' 
                        : 'bg-zinc-900/10 border-white/[0.02] hover:bg-zinc-900/30 hover:border-white/[0.06]'
                    }`}
                  >
                    {/* Card Principal - sempre visível */}
                    <div 
                      onClick={() => toggleExpand(v.id || String(i))}
                      className="flex items-center justify-between p-5 gap-4"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-zinc-900 border border-white/[0.03] shrink-0">
                          <span className="text-xs font-bold text-white leading-none">
                            {new Date(v.booking_date).toLocaleDateString('pt-BR', { day: '2-digit' })}
                          </span>
                          <span className="text-[7px] font-black text-zinc-700 uppercase mt-0.5">
                            {new Date(v.booking_date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13px] font-bold text-zinc-200 uppercase tracking-tight truncate">
                            {v.service_name || 'Serviço Executivo'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold text-zinc-650 uppercase tracking-widest whitespace-nowrap">
                              {v.booking_time.split(':').slice(0, 2).join(':')}
                            </span>
                            <span className="w-0.5 h-0.5 rounded-full bg-zinc-800" />
                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest truncate">
                              Finalizado
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xl font-bold text-white tracking-tighter">
                            <span className="text-[10px] text-zinc-700 mr-1 font-medium italic">R$</span>
                            {Number(v.total_price).toFixed(0)}
                          </p>
                        </div>
                        <ChevronDown 
                          size={14} 
                          className={`text-zinc-600 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-white' : ''}`} 
                        />
                      </div>
                    </div>

                    {/* Detalhes Expandidos */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-0 space-y-3">
                            <div className="h-px bg-white/[0.04]" />
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Data Completa</span>
                                <p className="text-xs font-bold text-white leading-snug">
                                  {new Date(v.booking_date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Horário</span>
                                <p className="text-xs font-bold text-white">
                                  {v.booking_time.split(':').slice(0, 2).join(':')}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Serviço</span>
                                <p className="text-xs font-bold text-white">
                                  {v.service_name || 'Serviço Executivo'}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Valor</span>
                                <p className="text-xs font-bold text-[#C5A059]">
                                  R$ {Number(v.total_price).toFixed(0)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Status</span>
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                                Finalizado
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="py-32 text-center border border-dashed border-white/[0.03] rounded-[40px]">
                <p className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.4em]">Sem registros</p>
              </div>
            )}
          </div>
        </motion.div>
        </div>
      </main>
      </div>

      <div className="lg:hidden">
        <BottomTabs />
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full sm:max-w-xs bg-[#111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden"
            >
              <div className="p-5 space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Limpar todo o histórico de visitas de <span className="text-white font-semibold">{client?.name}</span>? Essa ação não pode ser desfeita.
                </p>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 h-10 border border-white/[0.06] hover:bg-white/[0.03] text-zinc-400 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Manter
                  </button>
                  <button 
                    onClick={handleClearHistory}
                    disabled={isDeleting}
                    className="flex-1 h-10 bg-white/[0.04] border border-white/[0.06] hover:bg-red-500/10 hover:border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    {isDeleting ? '...' : 'Limpar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ClientVisits;
