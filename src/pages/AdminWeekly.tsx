import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateBookingStatus, deleteBooking } from '../lib/api';
import { TIME_SLOTS, getLocalDateString } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useBookings } from '../hooks/useBookings';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import AdminLayout from '../components/Admin/AdminLayout';
import FilterTabs from '../components/Admin/shared/FilterTabs';
import UnblockModal from '../components/Admin/shared/UnblockModal';
import CompleteModal from '../components/Admin/shared/CompleteModal';
import DeleteModal from '../components/Admin/shared/DeleteModal';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import { motion, AnimatePresence } from 'framer-motion';
import type { BookingWithClient } from '../types';

const AdminWeekly: React.FC = () => {
  const { bookings, loading, refetch: loadData } = useBookings();
  const { toast, showSuccess, showError } = useToast();
  const {
    blockingSlot,
    unblockingBooking,
    setUnblockingBooking,
    blockSlot,
    unblockSlot
  } = useSlotBlocking();
  
  const navigate = useNavigate();
  const today = new Date();
  
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(date.setDate(diff));
  };

  const [currentWeekStart] = useState(() => getMonday(today));

  const weekDays = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const todayIdx = weekDays.findIndex(d => d.toDateString() === today.toDateString());
    return todayIdx >= 0 ? todayIdx : 0;
  });

  const [filter, setFilter] = useState<'occupied' | 'free' | 'blocked'>('occupied');
  const [selectedBooking, setSelectedBooking] = useState<BookingWithClient | null>(null);
  const [completingBooking, setCompletingBooking] = useState<BookingWithClient | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<BookingWithClient | null>(null);

  const handleBlockSlot = async (date: string, slot: string) => {
    await blockSlot(date, slot, loadData, `${date}-${slot}`);
  };

  const handleUnblock = (booking: BookingWithClient) => {
    setUnblockingBooking(booking);
  };

  const confirmUnblock = async () => {
    if (!unblockingBooking) return;
    await unblockSlot(unblockingBooking.id, loadData);
  };

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

  const selectedDate = weekDays[selectedDayIndex];
  const selectedDateStr = getLocalDateString(selectedDate);
  const dayBookings = bookings.filter(b => b.booking_date === selectedDateStr && b.status !== 'cancelled');

  const filteredSlots = TIME_SLOTS.filter(slot => {
    const booking = dayBookings.find(b => b.booking_time.slice(0, 5) === slot);
    if (filter === 'occupied') {
      return !!booking && booking.clients?.name !== 'BLOQUEADO';
    }
    if (filter === 'free') {
      return !booking;
    }
    if (filter === 'blocked') {
      return !!booking && booking.clients?.name === 'BLOQUEADO';
    }
    return false;
  });

  const dayLabel = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AdminLayout
      wrapperClassName="min-h-screen bg-[#0A0A0A] text-white flex overflow-x-hidden selection:bg-[#C5A059]/30"
      innerClassName="flex-1 lg:ml-[320px] flex flex-col h-screen max-w-full overflow-x-hidden"
      mainClassName="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pt-24 lg:pt-8 pb-24 lg:pb-8"
    >
          <div className="max-w-4xl mx-auto space-y-5 w-full">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white uppercase italic">
                Agenda da Semana
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest capitalize">
                {dayLabel}
              </p>
            </div>

            {/* Week Navigator */}
            <div className="flex gap-1.5">
              {weekDays.map((day, idx) => {
                const isSelected = idx === selectedDayIndex;
                const isToday = day.toDateString() === today.toDateString();

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`flex-1 py-4 rounded-lg transition-all duration-200 flex flex-col items-center gap-0.5 relative ${
                      isSelected 
                        ? 'bg-[#C5A059] text-black' 
                        : isToday
                          ? 'bg-white/[0.04] text-[#C5A059]'
                          : 'bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                    }`}
                  >
                    <span className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-black/60' : 'opacity-50'}`}>
                      {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace(/\./g, '')}
                    </span>
                    <span className="text-lg font-black">{day.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {/* Filter + Count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {filteredSlots.length > 0 ? `${filteredSlots.length} ${filteredSlots.length === 1 ? 'horário' : 'horários'}` : ''}
              </span>
              <FilterTabs filter={filter} setFilter={setFilter} layoutId="activeFilterTabWeekly" />
            </div>

            {/* Slots List */}
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest">
                  {filter === 'occupied' 
                    ? 'Nenhum agendamento para este dia' 
                    : filter === 'free'
                      ? 'Nenhum horário disponível'
                      : 'Nenhum horário bloqueado'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <AnimatePresence mode="popLayout">
                  {filteredSlots.map((slot) => {
                    const booking = dayBookings.find(b => b.booking_time.slice(0, 5) === slot);
                    const isOccupied = !!booking;
                    const isBlocked = booking?.clients?.name === 'BLOQUEADO';

                    return (
                      <motion.div
                        key={`${selectedDateStr}-${slot}`}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => {
                          if (isOccupied && !isBlocked) {
                            setSelectedBooking(booking);
                          }
                        }}
                        className={`flex items-center bg-[#111111] border border-white/5 rounded-lg px-4 py-2.5 transition-all ${
                          isOccupied && !isBlocked 
                            ? 'cursor-pointer hover:border-[#C5A059]/20' 
                            : isBlocked
                              ? 'border-red-500/10'
                              : ''
                        }`}
                      >
                        <span className="text-sm font-bold text-white tabular-nums w-12 shrink-0">{slot}</span>
                        
                        <div className="w-px h-4 bg-white/[0.06] mx-3 shrink-0" />

                        {isOccupied ? (
                          isBlocked ? (
                            <>
                              <span className="text-[9px] font-bold text-red-400/50 uppercase tracking-wider flex-1">Bloqueado</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUnblock(booking); }}
                                className="text-[9px] font-bold text-red-400/70 hover:text-red-400 uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Desbloquear
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-[11px] font-bold text-zinc-300 truncate flex-1">{booking.clients?.name}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}
                                className="text-[9px] font-bold text-zinc-500 hover:text-[#C5A059] uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Ver
                              </button>
                            </>
                          )
                        ) : (
                          <div className="flex-1 flex items-center justify-end gap-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleBlockSlot(selectedDateStr, slot); }}
                              disabled={blockingSlot === `${selectedDateStr}-${slot}`}
                              className="text-[9px] font-bold text-red-400/50 hover:text-red-400 uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {blockingSlot === `${selectedDateStr}-${slot}` ? '...' : 'Bloquear'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate('/admin/agendar', { state: { date: selectedDateStr, time: slot } }); }}
                              className="text-[9px] font-bold text-zinc-500 hover:text-[#C5A059] uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Agendar
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/70"
            />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full sm:w-[340px] bg-[#161618] sm:rounded-2xl rounded-t-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{selectedBooking.clients?.name}</h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Data</span>
                  <span className="text-[11px] font-bold text-white">
                    {new Date(selectedBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Horário</span>
                  <span className="text-[11px] font-bold text-[#C5A059]">{selectedBooking.booking_time.slice(0, 5)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Valor</span>
                  <span className="text-[11px] font-bold text-white">R$ {(selectedBooking.total_price || 0).toFixed(0)}</span>
                </div>

                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  {selectedBooking.status !== 'completed' && (
                    <button 
                      onClick={() => { setCompletingBooking(selectedBooking); setSelectedBooking(null); }}
                      className="w-full py-3 bg-[#C5A059] text-black font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer"
                    >
                      Concluir
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setSelectedBooking(null); navigate('/admin/agendar', { state: { rescheduleBooking: selectedBooking } }); }}
                      className="flex-1 py-2.5 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-zinc-300 font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Reagendar
                    </button>
                    <button 
                      onClick={() => setBookingToDelete(selectedBooking)}
                      className="flex-1 py-2.5 border border-red-500/10 bg-red-500/5 text-red-400 font-bold text-[9px] uppercase tracking-wider rounded-xl hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <UnblockModal 
        booking={unblockingBooking} 
        onConfirm={confirmUnblock} 
        onCancel={() => setUnblockingBooking(null)} 
      />
      <CompleteModal 
        booking={completingBooking} 
        onConfirm={handleComplete} 
        onCancel={() => setCompletingBooking(null)} 
      />
      <DeleteModal 
        booking={bookingToDelete} 
        onConfirm={async () => {
          const id = bookingToDelete!.id;
          setBookingToDelete(null);
          setSelectedBooking(null);
          try {
            await deleteBooking(id);
            await loadData();
            showSuccess('Agendamento excluído!');
          } catch {
            showError('Erro ao excluir.');
          }
        }} 
        onCancel={() => setBookingToDelete(null)} 
      />
      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminWeekly;
