import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateBookingStatus, deleteBooking, createBooking, getBookings } from '../lib/api';
import { getTimeSlotsForDate, getLocalDateString } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useBookings } from '../hooks/useBookings';
import { useServices } from '../hooks/useServices';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import AdminLayout from '../components/Admin/AdminLayout';
import FilterTabs from '../components/Admin/shared/FilterTabs';
import UnblockModal from '../components/Admin/shared/UnblockModal';
import CompleteModal from '../components/Admin/shared/CompleteModal';
import DeleteModal from '../components/Admin/shared/DeleteModal';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import RescheduleWizard from '../components/Admin/shared/RescheduleWizard';
import BookingDetailPanel from '../components/Admin/shared/BookingDetailPanel';
import { motion, AnimatePresence } from 'framer-motion';
import type { BookingWithClient, Service, Booking } from '../types';

const AdminWeekly: React.FC = () => {
  const { bookings, loading, refetch: loadData } = useBookings();
  const { services } = useServices();
  const { toast, showSuccess, showError } = useToast();
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
  const today = new Date();
  
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const hour = date.getHours();
    let diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    
    if (day === 0 || (day === 6 && hour >= 18)) {
      diff += 7;
    }
    
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

  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleServices, setRescheduleServices] = useState<Service[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [existingBookingsForReschedule, setExistingBookingsForReschedule] = useState<Booking[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);
  const [rescheduleStep, setRescheduleStep] = useState(1);

  const loadRescheduleSlots = async (date: string) => {
    setLoadingSlots(true);
    try {
      const data = await getBookings(date);
      setExistingBookingsForReschedule(data || []);
    } catch { /* ignored */ } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (!isRescheduling || !rescheduleDate) return;
    void loadRescheduleSlots(rescheduleDate);
  }, [rescheduleDate, isRescheduling]);

  const handleStartReschedule = () => {
    if (!selectedBooking) return;
    const initialServices = services.filter(s => selectedBooking.service_ids?.includes(s.id));
    setRescheduleServices(initialServices);
    setRescheduleDate(selectedBooking.booking_date);
    setRescheduleTime(selectedBooking.booking_time.slice(0, 5));
    setRescheduleStep(1);
    setIsRescheduling(true);
  };

  const handleCloseReschedule = () => {
    setIsRescheduling(false);
    setRescheduleStep(1);
  };

  const handleConfirmReschedule = async () => {
    if (!selectedBooking || rescheduleServices.length === 0 || !rescheduleDate || !rescheduleTime) return;
    setIsSavingReschedule(true);
    try {
      await deleteBooking(selectedBooking.id);
      
      const totalPrice = rescheduleServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
      const totalDuration = rescheduleServices.reduce((sum, s) => sum + (s.duration || 0), 0);

      await createBooking(
        {
          service_ids: rescheduleServices.map(s => s.id),
          booking_date: rescheduleDate,
          booking_time: rescheduleTime,
          total_price: totalPrice,
          total_duration: totalDuration
        },
        {
          name: selectedBooking.clients?.name || '',
          phone: selectedBooking.clients?.phone || ''
        }
      );

      showSuccess('Agendamento reagendado com sucesso!');
      setSelectedBooking(null);
      setIsRescheduling(false);
      setRescheduleStep(1);
      await loadData();
    } catch {
      showError('Erro ao reagendar.');
    } finally {
      setIsSavingReschedule(false);
    }
  };

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

  const occupiedBookings = dayBookings.filter(b => b.status !== 'cancelled' && !b.is_blocked);
  const freeSlots = getTimeSlotsForDate(selectedDateStr).filter(slot => !dayBookings.some(b => b.booking_time.slice(0, 5) === slot && b.status !== 'cancelled'));
  const blockedBookings = dayBookings.filter(b => b.status !== 'cancelled' && b.is_blocked);

  const occupiedCount = occupiedBookings.length;
  const freeCount = freeSlots.length;
  const blockedCount = blockedBookings.length;

  const dayLabel = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AdminLayout
      mainClassName="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-8 pb-40"
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

            {/* Filter Tabs */}
            <div className="flex border-b border-white/[0.04] pb-1 pt-1 justify-start">
              <FilterTabs
                filter={filter}
                setFilter={setFilter}
                layoutId="weeklyFilter"
                occupiedCount={occupiedCount}
                freeCount={freeCount}
                blockedCount={blockedCount}
              />
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="pt-2">
                {filter === 'occupied' && (
                  <div className="space-y-2">
                    {occupiedBookings.length === 0 ? (
                      <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">Nenhum agendamento</p>
                    ) : (
                      occupiedBookings.map((booking) => (
                        <button
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          aria-label={`Agendamento às ${booking.booking_time.slice(0, 5)} com ${booking.clients?.name}`}
                          className={`w-full flex items-center bg-[#111111] border border-white/5 rounded-lg px-3 py-2.5 cursor-pointer transition-all hover:border-[#C5A059]/20 text-left`}
                        >
                          <span className="text-sm font-bold text-white tabular-nums w-12 shrink-0">{booking.booking_time.slice(0, 5)}</span>
                          <div className="w-px h-3.5 bg-white/[0.06] mx-3 shrink-0" />
                          <span className="text-[11px] font-bold text-zinc-300 truncate flex-1">{booking.clients?.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {filter === 'free' && (
                  <div className="space-y-2">
                    {freeSlots.length > 0 && (
                      <button
                        onClick={() => blockEntireDay(selectedDateStr, freeSlots, loadData)}
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
                          <span className="text-sm font-bold text-white tabular-nums w-12 shrink-0">{slot}</span>
                          <div className="flex-1 flex items-center justify-end gap-6">
                            <button onClick={() => handleBlockSlot(selectedDateStr, slot)} disabled={blockingSlot === `${selectedDateStr}-${slot}`} className="text-[9px] font-bold text-red-400/50 hover:text-red-400 uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50">Bloquear</button>
                            <button onClick={() => navigate('/admin/agendar', { state: { date: selectedDateStr, time: slot } })} className="text-[9px] font-bold text-zinc-500 hover:text-[#C5A059] uppercase tracking-wider transition-colors cursor-pointer">Agendar</button>
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
                          <span className="text-sm font-bold text-white tabular-nums w-12 shrink-0">{booking.booking_time.slice(0, 5)}</span>
                          <div className="flex-1 flex items-center justify-end">
                            <button onClick={() => handleUnblock(booking)} className="text-[9px] font-bold text-red-400/70 hover:text-red-400 uppercase tracking-wider transition-colors cursor-pointer">Desbloquear</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

      {/* DESKTOP DETAIL PANEL */}
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
                    onClose={handleCloseReschedule}
                  />
                ) : (
                  <BookingDetailPanel
                    booking={selectedBooking}
                    services={services}
                    onClose={() => setSelectedBooking(null)}
                    onComplete={() => { setCompletingBooking(selectedBooking); }}
                    onReschedule={handleStartReschedule}
                    onDelete={() => setBookingToDelete(selectedBooking)}
                  />
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

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
                    onClose={handleCloseReschedule}
                  />
                ) : (
                  <BookingDetailPanel
                    booking={selectedBooking}
                    services={services}
                    onClose={() => setSelectedBooking(null)}
                    onComplete={() => { setCompletingBooking(selectedBooking); }}
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
      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminWeekly;
