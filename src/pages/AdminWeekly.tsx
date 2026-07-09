import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocalDateString } from '../lib/utils';
import { getAvailableSlots } from '../lib/api';
import { useBookings } from '../hooks/useBookings';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import { useBookingManagement } from '../hooks/useBookingManagement';
import { useBarberSettings } from '../contexts/BarberSettingsContext';
import AdminLayout from '../components/Admin/AdminLayout';
import FilterTabs from '../components/Admin/shared/FilterTabs';
import UnblockModal from '../components/Admin/shared/UnblockModal';
import CompleteModal from '../components/Admin/shared/CompleteModal';
import ThankYouModal from '../components/Admin/shared/ThankYouModal';
import DeleteModal from '../components/Admin/shared/DeleteModal';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import RescheduleWizard from '../components/Admin/shared/RescheduleWizard';
import BookingDetailPanel from '../components/Admin/shared/BookingDetailPanel';
import { SkeletonDashboard } from '../components/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const AdminWeekly: React.FC = () => {
  const { bookings, loading, refetch: loadData } = useBookings();
  const mgmt = useBookingManagement(loadData);
  const navigate = useNavigate();
  const today = new Date();

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const hour = date.getHours();
    let diff = date.getDate() - day + (day === 0 ? -6 : 1);
    if (day === 0 || (day === 6 && hour >= 18)) diff += 7;
    return new Date(date.setDate(diff));
  };

  const { barberHours } = useBarberSettings();

  const [currentWeekStart] = useState(() => getMonday(today));

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Dias habilitados nas configurações
  const enabledDays = React.useMemo(() => {
    if (!barberHours) return null;
    try {
      const parsed = JSON.parse(barberHours);
      const map: Record<number, boolean> = {};
      for (let d = 0; d <= 6; d++) map[d] = parsed[String(d)]?.enabled !== false;
      return map;
    } catch {
      return null;
    }
  }, [barberHours]);

  // Filtra só os dias habilitados
  const visibleWeekDays = weekDays.filter((d) => {
    if (!enabledDays) return true;
    return enabledDays[d.getDay()] !== false;
  });

  const [selectedVisibleIndex, setSelectedVisibleIndex] = useState(() => {
    // Tenta selecionar hoje; se estiver desabilitado, pega o primeiro dia habilitado
    const todayStr = today.toDateString();
    const idx = visibleWeekDays.findIndex((d) => d.toDateString() === todayStr);
    return idx >= 0 ? idx : 0;
  });

  const [allSlots, setAllSlots] = useState<string[]>([]);

  const {
    blockingSlot,
    unblockingBooking,
    setUnblockingBooking,
    blockSlot,
    unblockSlot,
    blockingDay,
    blockEntireDay,
    unblockEntireDay,
  } = useSlotBlocking();

  // Se todos os dias estão desabilitados, não quebra
  const hasVisibleDays = visibleWeekDays.length > 0;
  const selectedDate = hasVisibleDays ? visibleWeekDays[selectedVisibleIndex] : new Date();
  const selectedDateStr = getLocalDateString(selectedDate);
  const isToday = hasVisibleDays && selectedDate.toDateString() === today.toDateString();
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [currentMinutes, setCurrentMinutes] = useState(
    () => new Date().getHours() * 60 + new Date().getMinutes()
  );

  // Update time every minute so stale time values don't cause incorrect filtering
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours());
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Se todos os dias mudarem (ex: carregou barberHours), ajusta o índice selecionado
  useEffect(() => {
    if (selectedVisibleIndex >= visibleWeekDays.length) {
      setSelectedVisibleIndex(0);
    }
  }, [visibleWeekDays.length, selectedVisibleIndex]);

  useEffect(() => {
    let active = true;
    getAvailableSlots(selectedDateStr).then((slots) => {
      if (active) setAllSlots(slots);
    });
    return () => {
      active = false;
    };
  }, [selectedDateStr, barberHours]);

  const handleBlockSlot = async (date: string, slot: string) => {
    await blockSlot(date, slot, loadData, `${date}-${slot}`);
  };

  const confirmUnblock = async () => {
    if (!unblockingBooking) return;
    await unblockSlot(unblockingBooking.id, loadData);
  };

  const dayBookings = bookings.filter(
    (b) => b.booking_date === selectedDateStr && b.status !== 'cancelled'
  );
  const occupiedBookings = dayBookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    if (b.is_blocked) return false;
    if (!isToday) return true;
    const [h, m] = b.booking_time.slice(0, 5).split(':').map(Number);
    const bookingEndMinutes = h * 60 + m + (b.total_duration || 60);
    return bookingEndMinutes > currentMinutes;
  });
  const freeSlots = allSlots.filter((slot) => {
    if (dayBookings.some((b) => b.booking_time.slice(0, 5) === slot && b.status !== 'cancelled')) {
      return false;
    }
    if (!isToday) return true;
    const slotHour = parseInt(slot.split(':')[0], 10);
    return slotHour >= currentHour;
  });
  const blockedBookings = dayBookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    if (!b.is_blocked) return false;
    if (!isToday) return true;
    const slotHour = parseInt(b.booking_time.slice(0, 5).split(':')[0], 10);
    return slotHour >= currentHour;
  });
  const dayLabel = selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const renderDetailPanel = () => {
    if (!mgmt.selectedBooking) return null;
    return mgmt.isRescheduling ? (
      <RescheduleWizard
        selectedBooking={mgmt.selectedBooking}
        services={mgmt.services}
        step={mgmt.rescheduleStep}
        setStep={mgmt.setRescheduleStep}
        rescheduleServices={mgmt.rescheduleServices}
        setRescheduleServices={mgmt.setRescheduleServices}
        rescheduleDate={mgmt.rescheduleDate}
        setRescheduleDate={mgmt.setRescheduleDate}
        rescheduleTime={mgmt.rescheduleTime}
        setRescheduleTime={mgmt.setRescheduleTime}
        existingBookings={mgmt.existingBookingsForReschedule}
        loadingSlots={mgmt.loadingSlots}
        isSaving={mgmt.isSavingReschedule}
        onConfirm={mgmt.handleConfirmReschedule}
        onClose={() => {
          mgmt.setSelectedBooking(null);
          mgmt.cancelReschedule();
        }}
      />
    ) : (
      <BookingDetailPanel
        booking={mgmt.selectedBooking}
        services={mgmt.services}
        onClose={() => mgmt.setSelectedBooking(null)}
        onComplete={() => mgmt.setCompletingBooking(mgmt.selectedBooking)}
        onReschedule={mgmt.handleStartReschedule}
        onDelete={() => mgmt.setBookingToDelete(mgmt.selectedBooking)}
        onUnblock={() => {
          setUnblockingBooking(mgmt.selectedBooking);
          mgmt.setSelectedBooking(null);
        }}
      />
    );
  };

  const closePanel = () => {
    mgmt.setSelectedBooking(null);
    mgmt.cancelReschedule();
  };

  return (
    <AdminLayout mainClassName="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-8 pb-40">
      <div className="max-w-4xl mx-auto space-y-5 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white uppercase italic">
            Agenda da Semana
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest capitalize">
            {dayLabel}
          </p>
        </div>

        <div className="flex gap-1.5">
          {visibleWeekDays.map((day, idx) => {
            const isSelected = idx === selectedVisibleIndex;
            const isToday = day.toDateString() === today.toDateString();
            return (
              <button
                key={idx}
                onClick={() => setSelectedVisibleIndex(idx)}
                className={`flex-1 py-4 rounded-lg transition-all duration-200 flex flex-col items-center gap-0.5 relative ${isSelected ? 'bg-[#C5A059] text-black' : isToday ? 'bg-white/[0.04] text-[#C5A059]' : 'bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'}`}
              >
                <span
                  className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-black/60' : 'opacity-50'}`}
                >
                  {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace(/\./g, '')}
                </span>
                <span className="text-lg font-black">{day.getDate()}</span>
              </button>
            );
          })}
        </div>

        <div className="flex border-b border-white/[0.04] pb-1 pt-1 justify-start">
          <FilterTabs
            filter={mgmt.filter}
            setFilter={mgmt.setFilter}
            layoutId="weeklyFilter"
            occupiedCount={occupiedBookings.length}
            freeCount={freeSlots.length}
            blockedCount={blockedBookings.length}
          />
        </div>

        {loading ? (
          <SkeletonDashboard />
        ) : (
          <div className="pt-2">
            {mgmt.filter === 'occupied' && (
              <div className="space-y-2">
                {occupiedBookings.length === 0 ? (
                  <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">
                    Nenhum agendamento
                  </p>
                ) : (
                  occupiedBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center bg-[#111111] border border-white/5 rounded-lg px-3 py-2 transition-all hover:border-[#C5A059]/20 group"
                    >
                      {/* Hora + Nome */}
                      <button
                        onClick={() => mgmt.setSelectedBooking(booking)}
                        aria-label={`Agendamento às ${booking.booking_time.slice(0, 5)} com ${booking.clients?.name}`}
                        className="flex items-center flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <span className="text-sm font-bold text-white tabular-nums w-12 shrink-0">
                          {booking.booking_time.slice(0, 5)}
                        </span>
                        <div className="w-px h-3.5 bg-white/[0.06] mx-3 shrink-0" />
                        <span className="text-[11px] font-bold text-zinc-300 truncate flex-1">
                          {booking.clients?.name}
                        </span>
                      </button>

                      {/* Seta */}
                      <button
                        onClick={() => mgmt.setSelectedBooking(booking)}
                        className="ml-auto p-1 text-zinc-600 hover:text-[#C5A059] transition-colors cursor-pointer shrink-0"
                        aria-label="Ver detalhes"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
            {mgmt.filter === 'free' && (
              <div className="space-y-2">
                {freeSlots.length > 0 && (
                  <button
                    onClick={() => blockEntireDay(selectedDateStr, freeSlots, loadData)}
                    disabled={blockingDay}
                    className="group w-full mb-4 py-3.5 px-4 bg-zinc-900/30 hover:bg-red-500/[0.04] border border-white/[0.04] hover:border-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {blockingDay ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                    Bloquear Dia Inteiro
                  </button>
                )}
                {freeSlots.length === 0 ? (
                  <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">
                    Nenhum horário livre
                  </p>
                ) : (
                  freeSlots.map((slot) => (
                    <div
                      key={`free-${slot}`}
                      className="flex items-center bg-[#111111] border border-white/5 rounded-lg px-3 py-2.5"
                    >
                      <span className="text-sm font-bold text-white tabular-nums w-12 shrink-0">
                        {slot}
                      </span>
                      <div className="flex-1 flex items-center justify-end gap-6">
                        <button
                          onClick={() => handleBlockSlot(selectedDateStr, slot)}
                          disabled={blockingSlot === `${selectedDateStr}-${slot}`}
                          className="text-[9px] font-bold text-red-400/50 hover:text-red-400 uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Bloquear
                        </button>
                        <button
                          onClick={() =>
                            navigate('/admin/agendar', {
                              state: { date: selectedDateStr, time: slot },
                            })
                          }
                          className="text-[9px] font-bold text-zinc-500 hover:text-[#C5A059] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Agendar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {mgmt.filter === 'blocked' && (
              <div className="space-y-2">
                {blockedBookings.length > 0 && (
                  <button
                    onClick={() => unblockEntireDay(blockedBookings, loadData)}
                    disabled={blockingDay}
                    className="group w-full mb-4 py-3.5 px-4 bg-zinc-900/30 hover:bg-emerald-500/[0.04] border border-white/[0.04] hover:border-emerald-500/20 text-zinc-400 hover:text-emerald-400 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {blockingDay ? (
                      <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </svg>
                    )}
                    Liberar Dia Inteiro
                  </button>
                )}
                {blockedBookings.length === 0 ? (
                  <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">
                    Nenhum horário bloqueado
                  </p>
                ) : (
                  blockedBookings.map((booking) => (
                    <div
                      key={`blocked-${booking.id}`}
                      className="flex items-center bg-[#111111] border border-white/5 rounded-lg px-3 py-2.5"
                    >
                      <span className="text-sm font-bold text-white tabular-nums w-12 shrink-0">
                        {booking.booking_time.slice(0, 5)}
                      </span>
                      <div className="flex-1 flex items-center justify-end">
                        <button
                          onClick={() => setUnblockingBooking(booking)}
                          className="text-[9px] font-bold text-red-400/70 hover:text-red-400 uppercase tracking-wider transition-colors cursor-pointer"
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

      {mgmt.isDesktop && (
        <AnimatePresence>
          {mgmt.selectedBooking && (
            <div className="fixed inset-0 z-[200] flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closePanel}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-[400px] h-full bg-[#0E0E0E] border-l border-white/[0.06] shadow-2xl overflow-hidden flex flex-col"
              >
                {renderDetailPanel()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      <UnblockModal
        booking={unblockingBooking}
        onConfirm={confirmUnblock}
        onCancel={() => setUnblockingBooking(null)}
      />
      <CompleteModal
        booking={mgmt.completingBooking}
        onConfirm={mgmt.handleComplete}
        onCancel={() => mgmt.setCompletingBooking(null)}
      />
      <ThankYouModal
        booking={mgmt.thankYouBooking}
        services={mgmt.services}
        onConfirm={mgmt.handleSendThankYou}
        onCancel={mgmt.handleCancelThankYou}
      />
      <DeleteModal
        booking={mgmt.bookingToDelete}
        onConfirm={mgmt.confirmDelete}
        onCancel={() => mgmt.setBookingToDelete(null)}
      />

      {!mgmt.isDesktop && (
        <AnimatePresence>
          {mgmt.selectedBooking && (
            <div className="fixed inset-0 z-[200] flex flex-col justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closePanel}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full h-[100dvh] bg-[#0f0f0f] z-10 flex flex-col text-left overflow-hidden"
              >
                {renderDetailPanel()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      <ToastNotification toast={mgmt.toast} />
    </AdminLayout>
  );
};

export default AdminWeekly;
