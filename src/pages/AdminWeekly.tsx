import { useState, useEffect, useMemo, useCallback, type FC, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocalDateString, formatDisplayName } from '../lib/utils';
import { getAvailableSlots } from '../lib/api';
import { useBookings } from '../hooks/useBookings';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import { useBookingManagement } from '../hooks/useBookingManagement';
import { useBarberSettings } from '../hooks/useBarberSettings';
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

/** Calcula segunda-feira da semana atual, respeitando horário de fechamento de sábado */
function getMondayFromDate(d: Date, barberHoursJson?: string): Date {
  const date = new Date(d);
  const day = date.getDay();
  const hour = date.getHours();
  const minutes = date.getMinutes();
  let diff = date.getDate() - day + (day === 0 ? -6 : 1);

  // Puxa horário de fechamento do sábado das configurações
  let satClosingHour = 18;
  try {
    if (barberHoursJson) {
      const parsed = JSON.parse(barberHoursJson);
      const sat = parsed['6'];
      if (sat?.close) {
        const [h] = sat.close.split(':').map(Number);
        if (!isNaN(h)) satClosingHour = h;
      }
    }
  } catch {
    // fallback
  }

  if (day === 6 && (hour > satClosingHour || (hour === satClosingHour && minutes > 0))) {
    diff += 7;
  }
  return new Date(date.setDate(diff));
}

const AdminWeekly: FC = () => {
  const { bookings, loading, refetch: loadData } = useBookings();
  const mgmt = useBookingManagement(loadData);
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);

  const { barberHours } = useBarberSettings();

  const currentWeekStart = useMemo(
    () => getMondayFromDate(today, barberHours),
    [today, barberHours]
  );

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [currentWeekStart]
  );

  // Dias habilitados nas configurações
  const enabledDays = useMemo(() => {
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
  const visibleWeekDays = useMemo(
    () =>
      weekDays.filter((d) => {
        if (!enabledDays) return true;
        return enabledDays[d.getDay()] !== false;
      }),
    [weekDays, enabledDays]
  );

  const getInitialDayIndex = useCallback(() => {
    const todayStr = new Date().toDateString();
    const idx = visibleWeekDays.findIndex((d) => d.toDateString() === todayStr);
    return idx >= 0 ? idx : 0;
  }, [visibleWeekDays]);

  const [selectedVisibleIndex, setSelectedVisibleIndex] = useState(getInitialDayIndex);

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
      // Tenta encontrar hoje no novo array; senão, pega o primeiro
      const todayStr = today.toDateString();
      const todayIdx = visibleWeekDays.findIndex((d) => d.toDateString() === todayStr);
      setSelectedVisibleIndex(todayIdx >= 0 ? todayIdx : 0);
    }
  }, [visibleWeekDays, visibleWeekDays.length, selectedVisibleIndex, today]);

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
            const isPast = day < today && !isToday;
            return (
              <button
                key={idx}
                onClick={() => !isPast && setSelectedVisibleIndex(idx)}
                disabled={isPast}
                className={`flex-1 py-4 rounded-lg transition-all duration-200 flex flex-col items-center gap-0.5 relative ${
                  isPast
                    ? 'bg-white/[0.01] text-zinc-700 cursor-not-allowed opacity-40'
                    : isSelected
                      ? 'bg-[#C5A059] text-black'
                      : isToday
                        ? 'bg-white/[0.04] text-[#C5A059]'
                        : 'bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                }`}
              >
                <span
                  className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-black/60' : isPast ? 'text-zinc-700' : 'opacity-50'}`}
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
                  occupiedBookings.map((booking) => {
                    const handleReminder = (e: MouseEvent) => {
                      e.stopPropagation();
                      const phone = booking.clients?.phone?.replace(/\D/g, '') || '';
                      const name = booking.clients?.name || '';
                      const serviceNames =
                        booking.service_ids
                          ?.map((id) => mgmt.services.find((s) => s.id === id)?.name)
                          .filter(Boolean)
                          .join(', ') || '';
                      const date = booking.booking_date;
                      const time = booking.booking_time.slice(0, 5);
                      const msg = `✅ *Agendamento confirmado, ${name}!*\n\nNa *Black Diamond*\n\n✂️ ${serviceNames}\n📅 ${date} às ${time}\n\nAguardamos você! 💈`;
                      window.open(
                        `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`,
                        '_blank'
                      );
                    };

                    return (
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
                            {formatDisplayName(booking.clients?.name)}
                          </span>
                        </button>

                        {/* Ações */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Lembrete - Desktop */}
                          <button
                            onClick={handleReminder}
                            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#C5A059]/10 hover:bg-[#C5A059]/20 text-[#C5A059] text-[9px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer"
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            Lembrete
                          </button>

                          {/* Lembrete - Mobile (só ícone) */}
                          <button
                            onClick={handleReminder}
                            className="lg:hidden p-1.5 text-zinc-600 hover:text-[#C5A059] transition-colors cursor-pointer"
                            aria-label="Enviar lembrete"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                          </button>

                          {/* Seta */}
                          <button
                            onClick={() => mgmt.setSelectedBooking(booking)}
                            className="p-1 text-zinc-600 hover:text-[#C5A059] transition-colors cursor-pointer"
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
                      </div>
                    );
                  })
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
                    className="group w-full mb-4 py-3.5 px-4 bg-zinc-900/30 hover:bg-emerald-500/[0.04] border border-white/[0.04] hover:border-emerald-500/20 text-zinc-400 hover:text-[#C5A059] rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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
