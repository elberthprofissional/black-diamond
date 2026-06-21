import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateBookingStatus, deleteBooking, getAvailableSlots } from '../lib/api';
import { getLocalDateString } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useServices } from '../hooks/useServices';
import { useBookings } from '../hooks/useBookings';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import AdminLayout from '../components/Admin/AdminLayout';
import UnblockModal from '../components/Admin/shared/UnblockModal';
import CompleteModal from '../components/Admin/shared/CompleteModal';
import DeleteModal from '../components/Admin/shared/DeleteModal';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import WhatsAppReminderButton from '../components/Admin/shared/WhatsAppReminderButton';
import { motion, AnimatePresence } from 'framer-motion';

import type { BookingWithClient } from '../types';

const AdminDashboard: React.FC = () => {
  const selectedDate = getLocalDateString();
  const { bookings, loading, refetch: loadData } = useBookings(selectedDate);
  const { services } = useServices();
  const { toast, showSuccess, showError } = useToast();
  const [completingBooking, setCompletingBooking] = useState<BookingWithClient | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithClient | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<BookingWithClient | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const { blockingSlot, unblockingBooking, setUnblockingBooking, blockSlot, unblockSlot } = useSlotBlocking();
  const navigate = useNavigate();

  useEffect(() => {
    const loadAvailableSlots = async () => {
      try {
        const slots = await getAvailableSlots(selectedDate);
        setAvailableSlots(slots);
      } catch (error) {
        console.error(error);
        // Fallback para slots padrão
        setAvailableSlots(['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']);
      }
    };
    loadAvailableSlots();
  }, [selectedDate]);

  const handleComplete = async () => {
    if (!completingBooking) return;
    try {
      await updateBookingStatus(completingBooking.id, 'completed');
      setCompletingBooking(null);
      loadData();
      showSuccess('Atendimento concluído!');
    } catch {
      showError('Erro ao finalizar agendamento.');
    }
  };

  const handleBlockSlot = async (slot: string) => {
    await blockSlot(selectedDate, slot, loadData);
  };

  const confirmUnblock = async () => {
    if (!unblockingBooking) return;
    await unblockSlot(unblockingBooking.id, loadData);
  };

  const dailyRevenue = bookings
    .filter(b => b.status === 'completed' || b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);


  const occupiedBookings = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled' && b.clients?.name !== 'BLOQUEADO');
  const blockedBookings = bookings.filter(b => b.status !== 'cancelled' && b.clients?.name === 'BLOQUEADO');
  
  const isTimeOccupied = (time: string) => {
    return bookings.some(b => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === time);
  };
  const freeSlots = availableSlots.filter(slot => !isTimeOccupied(slot));

  const getNextBooking = () => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const upcoming = bookings
      .filter(b => b.status !== 'cancelled' && b.booking_time >= currentTime && b.clients?.name !== 'BLOQUEADO')
      .sort((a, b) => a.booking_time.localeCompare(b.booking_time));
    
    return upcoming[0] || null;
  };

  const nextBooking = getNextBooking();

  return (
    <AdminLayout
      wrapperClassName="min-h-screen bg-[#0A0A0A] text-white font-sans flex selection:bg-[#C5A059]/30"
      innerClassName="flex-1 lg:ml-[320px] flex flex-col min-h-screen overflow-y-auto overscroll-contain bg-[#0A0A0A]"
      mainClassName={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-8 pb-20 sm:pb-28 transition-all duration-300 ${
        selectedBooking ? 'max-w-7xl' : 'max-w-5xl'
      }`}
    >
          <div className={`grid grid-cols-1 ${selectedBooking ? 'lg:grid-cols-[1fr_360px] lg:gap-8' : ''} items-start`}>
            
            {/* Left Column: Agenda Content */}
            <div className="space-y-5">
              {/* 1. TOP BAR */}
              <div className="hidden lg:flex items-center justify-between gap-4 pb-3 border-b border-white/5">
                <h1 className="text-2xl font-bold tracking-tight text-white uppercase italic">Agenda do Dia</h1>
              </div>

              {/* 2. STATS */}
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <button
                  onClick={() => nextBooking && setSelectedBooking(nextBooking)}
                  className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex flex-col items-start min-w-0 group hover:border-[#C5A059]/20 hover:bg-white/[0.01] transition-all cursor-pointer"
                >
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Próximo Cliente</span>
                  {nextBooking ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white uppercase tracking-tight truncate">{nextBooking.clients?.name.split(' ')[0]}</span>
                      <span className="text-xs font-bold text-[#C5A059] tabular-nums">{nextBooking.booking_time.slice(0, 5)}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-zinc-600">Sem cliente para hoje</span>
                  )}
                </button>
                <div className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex flex-col items-start">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Lucro do Dia</span>
                  <span className="text-sm font-black text-[#C5A059] tabular-nums">R$ {dailyRevenue.toFixed(0)}</span>
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
                  <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Carregando...</span>
                </div>
              ) : (
                <>
                  {/* 3. OCUPADOS */}
                  <div className="border-t border-white/[0.04] pt-4">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Ocupados</h2>
                      <span className="text-[9px] font-bold text-zinc-600 bg-white/[0.04] px-2 py-0.5 rounded-md">{occupiedBookings.length}</span>
                    </div>
                    <div className="space-y-2">
                      {occupiedBookings.length === 0 ? (
                        <p className="text-zinc-700 text-[10px] uppercase tracking-widest text-center py-8">Nenhum agendamento</p>
                      ) : (
                        occupiedBookings.map((booking) => (
                          <div
                            key={booking.id}
                            onClick={() => setSelectedBooking(booking)}
                            className={`flex items-center rounded-lg border cursor-pointer transition-all ${
                              selectedBooking?.id === booking.id
                                ? 'border-[#C5A059]/40 bg-[#C5A059]/5'
                                : 'border-white/5 bg-[#111111] hover:border-white/10'
                            }`}
                          >
                            <div className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0">
                              <span className="text-sm font-bold text-zinc-500 tabular-nums w-10 shrink-0">{booking.booking_time.slice(0, 5)}</span>
                              <div className="w-px h-3.5 bg-white/10 shrink-0" />
                              <span className="text-[11px] font-medium text-zinc-200 truncate">{booking.clients?.name}</span>
                            </div>
                            {booking.clients?.phone && (
                              <WhatsAppReminderButton booking={booking} className="p-2.5 text-zinc-500 hover:text-emerald-500 transition-colors shrink-0" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 4. LIVRES */}
                  <div className="border-t border-white/[0.04] pt-4">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Livres</h2>
                      <span className="text-[9px] font-bold text-zinc-600 bg-white/[0.04] px-2 py-0.5 rounded-md">{freeSlots.length}</span>
                    </div>
                    <div className="space-y-2">
                      {freeSlots.length === 0 ? (
                        <p className="text-zinc-700 text-[10px] uppercase tracking-widest text-center py-8">Nenhum horário livre</p>
                      ) : (
                        freeSlots.map((slot) => (
                          <div key={`free-${slot}`} className="flex items-center bg-[#111111] border border-white/5 rounded-lg px-3 py-2.5">
                            <span className="text-sm font-bold text-zinc-400 tabular-nums w-10 shrink-0">{slot}</span>
                            <div className="flex-1 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleBlockSlot(slot)}
                                disabled={blockingSlot === slot}
                                className="text-[9px] font-bold uppercase tracking-wider text-red-400/60 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {blockingSlot === slot ? '...' : 'Bloquear'}
                              </button>
                              <button
                                onClick={() => navigate('/admin/agendar', { state: { date: selectedDate, time: slot } })}
                                className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer"
                              >
                                Agendar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 5. BLOQUEADOS */}
                  <div className="border-t border-white/[0.04] pt-4">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Bloqueados</h2>
                      <span className="text-[9px] font-bold text-zinc-600 bg-white/[0.04] px-2 py-0.5 rounded-md">{blockedBookings.length}</span>
                    </div>
                    <div className="space-y-2">
                      {blockedBookings.length === 0 ? (
                        <p className="text-zinc-700 text-[10px] uppercase tracking-widest text-center py-8">Nenhum horário bloqueado</p>
                      ) : (
                        blockedBookings.map((booking) => (
                          <div key={`blocked-${booking.id}`} className="flex items-center bg-[#111111] border border-white/5 rounded-lg px-3 py-2.5">
                            <span className="text-sm font-bold text-zinc-500 tabular-nums w-10 shrink-0">{booking.booking_time.slice(0, 5)}</span>
                            <div className="flex-1 flex items-center justify-end">
                              <button
                                onClick={() => setUnblockingBooking(booking)}
                                className="text-[9px] font-bold uppercase tracking-wider text-red-400/70 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                Desbloquear
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Desktop Detail Panel */}
            <AnimatePresence>
              {selectedBooking && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="hidden lg:flex flex-col bg-[#111111] border border-white/5 rounded-2xl overflow-hidden sticky top-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-[360px]"
                >
                  <div className="bg-white/[0.02] px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Detalhes</p>
                    <button onClick={() => setSelectedBooking(null)} className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition-all cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl">
                      <div className="w-10 h-10 bg-[#161616] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-[#C5A059] uppercase rounded-lg">{selectedBooking.clients?.name?.charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-white truncate">{selectedBooking.clients?.name}</h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{selectedBooking.clients?.phone}</p>
                      </div>
                    </div>
                    {selectedBooking.service_ids && selectedBooking.service_ids.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Serviços</p>
                        {selectedBooking.service_ids.map((id: string) => {
                          const srv = services.find(s => s.id === id);
                          return (
                            <div key={id} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                              <span className="text-xs font-medium text-white">{srv?.name || 'Serviço'}</span>
                              <span className="text-xs font-bold text-[#C5A059]">R$ {Number(srv?.price || 0).toFixed(0)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="py-2.5 px-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Data</p>
                        <p className="text-xs font-bold text-white">{new Date(selectedBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                      </div>
                      <div className="py-2.5 px-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Horário</p>
                        <p className="text-xs font-bold text-[#C5A059]">{selectedBooking.booking_time?.slice(0, 5)}</p>
                      </div>
                    </div>
                    <div className="py-3 px-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Valor Total</span>
                      <span className="text-base font-black text-[#C5A059]">R$ {(selectedBooking.total_price || 0).toFixed(0)}</span>
                    </div>
                    <div className="space-y-2 pt-2">
                      {selectedBooking.status !== 'completed' && (
                        <button onClick={() => { setCompletingBooking(selectedBooking); setSelectedBooking(null); }} className="w-full h-10 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer">Concluir</button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {selectedBooking.clients?.phone && (
                          <WhatsAppReminderButton booking={selectedBooking} className="h-10 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center" showLabel />
                        )}
                        <button onClick={() => { setSelectedBooking(null); navigate('/admin/agendar', { state: { rescheduleBooking: selectedBooking } }); }} className="h-10 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] text-white text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer">Reagendar</button>
                      </div>
                      <button onClick={() => setBookingToDelete(selectedBooking)} className="w-full text-[9px] font-bold uppercase tracking-widest text-red-500/70 hover:text-red-400 transition-colors cursor-pointer pt-2">Excluir</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

      {/* MODALS */}
      <CompleteModal booking={completingBooking} onConfirm={handleComplete} onCancel={() => setCompletingBooking(null)} />
      <UnblockModal booking={unblockingBooking} onConfirm={confirmUnblock} onCancel={() => setUnblockingBooking(null)} />
      <DeleteModal booking={bookingToDelete} onConfirm={async () => { const id = bookingToDelete!.id; setBookingToDelete(null); setSelectedBooking(null); try { await deleteBooking(id); await loadData(); showSuccess('Agendamento excluído!'); } catch { showError('Erro ao excluir.'); } }} onCancel={() => setBookingToDelete(null)} />

      {/* MOBILE DETAIL PANEL */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="lg:hidden fixed inset-0 z-[200] flex flex-col justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedBooking(null)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="relative w-full h-[100dvh] bg-[#0E0E0E] z-10 flex flex-col text-left overflow-y-auto">
              <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-6 py-5 border-b border-white/[0.04] flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em] block">Agendamento</span>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mt-1 truncate max-w-[240px]">{selectedBooking.clients?.name}</h3>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition-all cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="px-6 py-6 space-y-5 flex-1">
                <div className="bg-[#121212] border border-white/[0.03] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Horário</span>
                    <span className="text-xs font-black text-[#C5A059] tabular-nums">{new Date(selectedBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {selectedBooking.booking_time?.slice(0, 5)}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Serviços</span>
                    <div className="text-right flex flex-wrap justify-end gap-1.5 max-w-[200px]">
                      {selectedBooking.service_ids?.length > 0 ? selectedBooking.service_ids.map((id) => { const srv = services.find(s => s.id === id); return srv ? <span key={id} className="text-[9px] font-black uppercase tracking-wider bg-[#C5A059]/10 text-[#C5A059] px-2.5 py-0.5 rounded border border-[#C5A059]/15">{srv.name}</span> : null; }) : <span className="text-zinc-600 text-xs">—</span>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/[0.04]">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Valor Total</span>
                    <span className="text-base font-black text-white">R$ {(selectedBooking.total_price || 0).toFixed(0)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedBooking.status !== 'completed' && (
                    <button onClick={() => { setCompletingBooking(selectedBooking); setSelectedBooking(null); }} className="w-full h-12 bg-[#C5A059] text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#A68233] transition-all cursor-pointer">Concluir Atendimento</button>
                  )}
                  <div className="flex gap-2">
                    {selectedBooking.clients?.phone && <WhatsAppReminderButton booking={selectedBooking} className="flex-1 h-11 border border-white/[0.06] bg-white/[0.02] text-zinc-300 font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-center gap-1.5" showLabel />}
                    <button onClick={() => { setSelectedBooking(null); navigate('/admin/agendar', { state: { rescheduleBooking: selectedBooking } }); }} className="flex-1 h-11 border border-white/[0.06] bg-white/[0.02] text-zinc-300 font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer">Reagendar</button>
                  </div>
                  <div className="pt-3 border-t border-white/[0.04] text-center">
                    <button onClick={() => setBookingToDelete(selectedBooking)} className="text-[10px] font-bold uppercase tracking-widest text-red-500/80 hover:text-red-500 transition-colors cursor-pointer">Excluir agendamento</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminDashboard;
