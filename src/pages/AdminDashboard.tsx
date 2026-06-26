import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateBookingStatus, deleteBooking, getAvailableSlots } from '../lib/api';
import { getLocalDateString } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useServices } from '../hooks/useServices';
import { useBookings } from '../hooks/useBookings';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import { useReschedule } from '../hooks/useReschedule';
import AdminLayout from '../components/Admin/AdminLayout';
import FilterTabs from '../components/Admin/shared/FilterTabs';
import UnblockModal from '../components/Admin/shared/UnblockModal';
import CompleteModal from '../components/Admin/shared/CompleteModal';
import DeleteModal from '../components/Admin/shared/DeleteModal';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import WhatsAppReminderButton from '../components/Admin/shared/WhatsAppReminderButton';
import RescheduleWizard from '../components/Admin/shared/RescheduleWizard';
import BookingDetailPanel from '../components/Admin/shared/BookingDetailPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';

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
  const [filter, setFilter] = useState<'occupied' | 'free' | 'blocked'>('occupied');
  const { 
    blockingSlot, 
    unblockingBooking, 
    setUnblockingBooking, 
    blockSlot, 
    unblockSlot, 
    blockingDay, 
    blockEntireDay, 
    unblockEntireDay 
  } = useSlotBlocking();
  const navigate = useNavigate();

  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const {
    isRescheduling,
    rescheduleServices, setRescheduleServices,
    rescheduleDate, setRescheduleDate,
    rescheduleTime, setRescheduleTime,
    existingBookings: existingBookingsForReschedule,
    loadingSlots,
    isSaving: isSavingReschedule,
    rescheduleStep, setRescheduleStep,
    startReschedule: handleStartReschedule,
    confirmReschedule: handleConfirmRescheduleRaw,
    cancelReschedule,
  } = useReschedule(
    selectedBooking,
    services,
    () => { showSuccess('Agendamento reagendado com sucesso!'); loadData(); },
    () => { setSelectedBooking(null); },
    showError
  );

  const handleConfirmReschedule = async () => {
    await handleConfirmRescheduleRaw();
  };

  useEffect(() => {
    let active = true;
    const loadAvailableSlots = async () => {
      try {
        const slots = await getAvailableSlots(selectedDate);
        if (active) setAvailableSlots(slots);
      } catch {
        if (active) setAvailableSlots(['08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30', '16:30', '17:30', '18:30']);
      }
    };
    loadAvailableSlots();
    return () => { active = false; };
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


  const occupiedBookings = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled' && !b.is_blocked);
  const blockedBookings = bookings.filter(b => b.status !== 'cancelled' && b.is_blocked);
  
  const isTimeOccupied = (time: string) => {
    return bookings.some(b => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === time);
  };
  const freeSlots = availableSlots.filter(slot => !isTimeOccupied(slot));

  const occupiedCount = occupiedBookings.length;
  const freeCount = freeSlots.length;
  const blockedCount = blockedBookings.length;

  const getNextBooking = () => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const upcoming = bookings
      .filter(b => b.status !== 'cancelled' && b.booking_time >= currentTime && !b.is_blocked)
      .sort((a, b) => a.booking_time.localeCompare(b.booking_time));
    
    return upcoming[0] || null;
  };

  const nextBooking = getNextBooking();

  return (
    <AdminLayout
      mainClassName="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-8 pb-40 transition-all duration-300 max-w-5xl"
    >
      <div className="space-y-5">
            
            {/* Left Column: Agenda Content */}
            <div className="space-y-5">
              {/* 1. TOP BAR */}
              <div className="hidden lg:flex items-center justify-between gap-4 pb-3 border-b border-white/5">
                <h1 className="text-2xl font-bold tracking-tight text-white uppercase italic">Agenda do Dia</h1>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <button
                  onClick={() => nextBooking && setSelectedBooking(nextBooking)}
                  className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex items-center gap-3 min-w-0 group hover:border-[#C5A059]/20 hover:bg-white/[0.01] transition-all cursor-pointer"
                >
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Próximo Cliente</span>
                    {nextBooking ? (
                      <div className="flex items-baseline gap-2.5 mt-0.5 min-w-0">
                        <span className="text-[13px] font-bold text-white uppercase tracking-wide truncate">{nextBooking.clients?.name ?? ''}</span>
                        <span className="text-[11px] font-semibold text-[#C5A059] tabular-nums shrink-0">{nextBooking.booking_time.slice(0, 5)}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-zinc-600">Sem cliente para hoje</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#C5A059] transition-colors shrink-0" />
                </button>
                <div className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex flex-col items-start">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Lucro do Dia</span>
                  <span className="text-sm font-black text-[#C5A059] tabular-nums">R$ {dailyRevenue.toFixed(0)}</span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex border-b border-white/[0.04] pb-1 pt-1 justify-start">
                <FilterTabs
                  filter={filter}
                  setFilter={setFilter}
                  layoutId="dailyFilter"
                  occupiedCount={occupiedCount}
                  freeCount={freeCount}
                  blockedCount={blockedCount}
                />
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
                  <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Carregando...</span>
                </div>
              ) : (
                <div className="pt-2">
                  {filter === 'occupied' && (
                    <div className="space-y-2">
                      {occupiedBookings.length === 0 ? (
                        <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">Nenhum agendamento</p>
                      ) : (
                        occupiedBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className={`w-full flex items-center rounded-lg border cursor-pointer transition-all group ${
                              selectedBooking?.id === booking.id
                                ? 'border-[#C5A059]/40 bg-[#C5A059]/5'
                                : 'border-white/5 bg-[#111111] hover:border-white/10'
                            }`}
                          >
                            <div
                              onClick={() => setSelectedBooking(booking)}
                              role="button"
                              aria-label={`Agendamento às ${booking.booking_time.slice(0, 5)} com ${booking.clients?.name}`}
                              className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0"
                            >
                              <span className="text-sm font-bold text-zinc-500 tabular-nums w-10 shrink-0">{booking.booking_time.slice(0, 5)}</span>
                              <div className="w-px h-3.5 bg-white/10 shrink-0" />
                              <span className="text-[11px] font-medium text-zinc-200 truncate">{booking.clients?.name}</span>
                            </div>
                            {booking.clients?.phone && (
                              <WhatsAppReminderButton booking={booking} className="p-2.5 text-zinc-500 hover:text-emerald-500 transition-colors shrink-0" />
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setCompletingBooking(booking); }}
                              className="p-2.5 text-zinc-500 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                              aria-label="Concluir atendimento"
                            >
                              <Check size={15} strokeWidth={2.5} />
                            </button>
                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 mr-1" />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {filter === 'free' && (
                    <div className="space-y-2">
                      {freeSlots.length > 0 && (
                        <button
                          onClick={() => blockEntireDay(selectedDate, freeSlots, loadData)}
                          disabled={blockingDay}
                          className="group w-full mb-4 py-3.5 px-4 bg-zinc-900/30 hover:bg-red-500/[0.04] border border-white/[0.04] hover:border-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                        >
                          {blockingDay ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:scale-110"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          )}
                          Bloquear Dia Inteiro
                        </button>
                      )}
                      {freeSlots.length === 0 ? (
                        <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">Nenhum horário livre</p>
                      ) : (
                        freeSlots.map((slot) => (
                          <div key={`free-${slot}`} className="flex items-center bg-[#111111] border border-white/5 rounded-lg px-3 py-2.5">
                            <span className="text-sm font-bold text-zinc-400 tabular-nums w-10 shrink-0">{slot}</span>
                            <div className="flex-1 flex items-center justify-end gap-6">
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
                  )}

                  {filter === 'blocked' && (
                    <div className="space-y-2">
                      {blockedBookings.length > 0 && (
                        <button
                          onClick={() => unblockEntireDay(blockedBookings, loadData)}
                          disabled={blockingDay}
                          className="group w-full mb-4 py-3.5 px-4 bg-zinc-900/30 hover:bg-emerald-500/[0.04] border border-white/[0.04] hover:border-emerald-500/20 text-zinc-400 hover:text-emerald-400 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                        >
                          {blockingDay ? (
                            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:scale-110"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                          )}
                          Liberar Dia Inteiro
                        </button>
                      )}
                      {blockedBookings.length === 0 ? (
                        <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">Nenhum horário bloqueado</p>
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
                  )}
                </div>
              )}
            </div>
      </div>

      {/* Desktop Detail Panel - Fixed Sidebar */}
      {isDesktop && (
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-[400px] h-full bg-[#0E0E0E] border-l border-white/[0.06] shadow-2xl overflow-hidden flex flex-col"
            >
              {isRescheduling ? (
                <RescheduleWizard
                  selectedBooking={selectedBooking}
                  services={services}
                  step={rescheduleStep}
                  setStep={setRescheduleStep}
                  rescheduleServices={rescheduleServices}
                  setRescheduleServices={setRescheduleServices}
                  rescheduleDate={rescheduleDate}
                  setRescheduleDate={setRescheduleDate}
                  rescheduleTime={rescheduleTime}
                  setRescheduleTime={setRescheduleTime}
                  existingBookings={existingBookingsForReschedule}
                  loadingSlots={loadingSlots}
                  isSaving={isSavingReschedule}
                  onConfirm={handleConfirmReschedule}
                  onClose={() => { setSelectedBooking(null); cancelReschedule(); }}
                />
              ) : (
                <BookingDetailPanel
                  booking={selectedBooking}
                  services={services}
                  onClose={() => setSelectedBooking(null)}
                  onComplete={() => setCompletingBooking(selectedBooking)}
                  onReschedule={handleStartReschedule}
                  onDelete={() => setBookingToDelete(selectedBooking)}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      )}

      {/* MODALS */}
      <CompleteModal booking={completingBooking} onConfirm={handleComplete} onCancel={() => setCompletingBooking(null)} />
      <UnblockModal booking={unblockingBooking} onConfirm={confirmUnblock} onCancel={() => setUnblockingBooking(null)} />
      <DeleteModal 
        booking={bookingToDelete} 
        onConfirm={async () => { 
          const id = bookingToDelete?.id;
          if (!id) return;
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

      {/* MOBILE DETAIL PANEL */}
      {!isDesktop && (
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }} 
              className="relative w-full h-[100dvh] bg-[#0f0f0f] z-10 flex flex-col text-left overflow-hidden"
            >
              {isRescheduling ? (
                <RescheduleWizard
                  selectedBooking={selectedBooking}
                  services={services}
                  step={rescheduleStep}
                  setStep={setRescheduleStep}
                  rescheduleServices={rescheduleServices}
                  setRescheduleServices={setRescheduleServices}
                  rescheduleDate={rescheduleDate}
                  setRescheduleDate={setRescheduleDate}
                  rescheduleTime={rescheduleTime}
                  setRescheduleTime={setRescheduleTime}
                  existingBookings={existingBookingsForReschedule}
                  loadingSlots={loadingSlots}
                  isSaving={isSavingReschedule}
                  onConfirm={handleConfirmReschedule}
                  onClose={() => { setSelectedBooking(null); cancelReschedule(); }}
                />
              ) : (
                <BookingDetailPanel
                  booking={selectedBooking}
                  services={services}
                  onClose={() => setSelectedBooking(null)}
                  onComplete={() => setCompletingBooking(selectedBooking)}
                  onReschedule={handleStartReschedule}
                  onDelete={() => setBookingToDelete(selectedBooking)}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      )}

      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminDashboard;
