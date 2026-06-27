import React, { useState, useEffect } from 'react';
import { getAvailableSlots } from '../lib/api';
import { getLocalDateString, getTimeSlotsForDate } from '../lib/utils';
import { useBookings } from '../hooks/useBookings';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import { useBookingManagement } from '../hooks/useBookingManagement';
import AdminLayout from '../components/Admin/AdminLayout';
import FilterTabs from '../components/Admin/shared/FilterTabs';
import OccupiedPanel from '../components/Admin/shared/OccupiedPanel';
import FreePanel from '../components/Admin/shared/FreePanel';
import BlockedPanel from '../components/Admin/shared/BlockedPanel';
import UnblockModal from '../components/Admin/shared/UnblockModal';
import CompleteModal from '../components/Admin/shared/CompleteModal';
import DeleteModal from '../components/Admin/shared/DeleteModal';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import RescheduleWizard from '../components/Admin/shared/RescheduleWizard';
import BookingDetailPanel from '../components/Admin/shared/BookingDetailPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const selectedDate = getLocalDateString();
  const { bookings, loading, refetch: loadData } = useBookings(selectedDate);
  const m = useBookingManagement(loadData);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const {
    blockingSlot, unblockingBooking, setUnblockingBooking,
    blockSlot, unblockSlot, blockingDay, blockEntireDay, unblockEntireDay
  } = useSlotBlocking();

  useEffect(() => {
    let active = true;
    const loadAvailableSlots = async () => {
      try {
        const slots = await getAvailableSlots(selectedDate);
        if (active) setAvailableSlots(slots);
      } catch {
        if (active) setAvailableSlots(getTimeSlotsForDate(selectedDate));
      }
    };
    loadAvailableSlots();
    return () => { active = false; };
  }, [selectedDate]);

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
  const isTimeOccupied = (time: string) => bookings.some(b => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === time);
  const freeSlots = availableSlots.filter(slot => !isTimeOccupied(slot));

  const getNextBooking = () => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    return bookings.filter(b => b.status !== 'cancelled' && b.booking_time >= currentTime && !b.is_blocked).sort((a, b) => a.booking_time.localeCompare(b.booking_time))[0] || null;
  };
  const nextBooking = getNextBooking();

  const renderDetailPanel = () => {
    if (!m.selectedBooking) return null;
    return m.isRescheduling ? (
      <RescheduleWizard selectedBooking={m.selectedBooking} services={m.services} step={m.rescheduleStep} setStep={m.setRescheduleStep} rescheduleServices={m.rescheduleServices} setRescheduleServices={m.setRescheduleServices} rescheduleDate={m.rescheduleDate} setRescheduleDate={m.setRescheduleDate} rescheduleTime={m.rescheduleTime} setRescheduleTime={m.setRescheduleTime} existingBookings={m.existingBookingsForReschedule} loadingSlots={m.loadingSlots} isSaving={m.isSavingReschedule} onConfirm={m.handleConfirmReschedule} onClose={() => { m.setSelectedBooking(null); m.cancelReschedule(); }} />
    ) : (
      <BookingDetailPanel booking={m.selectedBooking} services={m.services} onClose={() => m.setSelectedBooking(null)} onComplete={() => m.setCompletingBooking(m.selectedBooking)} onReschedule={m.handleStartReschedule} onDelete={() => m.setBookingToDelete(m.selectedBooking)} />
    );
  };

  const closePanel = () => { m.setSelectedBooking(null); m.cancelReschedule(); };

  return (
    <AdminLayout mainClassName="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-8 pb-40 transition-all duration-300 max-w-5xl">
      <div className="space-y-5">
        <div className="space-y-5">
          <div className="hidden lg:flex items-center justify-between gap-4 pb-3 border-b border-white/5">
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase italic">Agenda do Dia</h1>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <button onClick={() => nextBooking && m.setSelectedBooking(nextBooking)} className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex items-center gap-3 min-w-0 group hover:border-[#C5A059]/20 hover:bg-white/[0.01] transition-all cursor-pointer">
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Próximo Cliente</span>
                {nextBooking ? (
                  <div className="flex items-baseline gap-2.5 mt-0.5 min-w-0">
                    <span className="text-[13px] font-bold text-white uppercase tracking-wide truncate">{nextBooking.clients?.name ?? ''}</span>
                    <span className="text-[11px] font-semibold text-[#C5A059] tabular-nums shrink-0">{nextBooking.booking_time.slice(0, 5)}</span>
                  </div>
                ) : <span className="text-xs font-medium text-zinc-600">Sem cliente para hoje</span>}
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#C5A059] transition-colors shrink-0" />
            </button>
            <div className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex flex-col items-start">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Lucro do Dia</span>
              <span className="text-sm font-black text-[#C5A059] tabular-nums">R$ {dailyRevenue.toFixed(0)}</span>
            </div>
          </div>

          <div className="flex border-b border-white/[0.04] pb-1 pt-1 justify-start">
            <FilterTabs filter={m.filter} setFilter={m.setFilter} layoutId="dailyFilter" occupiedCount={occupiedBookings.length} freeCount={freeSlots.length} blockedCount={blockedBookings.length} />
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Carregando...</span>
            </div>
          ) : (
            <div className="pt-2">
              {m.filter === 'occupied' && (
                <OccupiedPanel bookings={occupiedBookings} selectedId={m.selectedBooking?.id ?? null} onSelect={m.setSelectedBooking} onComplete={(b) => m.setCompletingBooking(b)} />
              )}
              {m.filter === 'free' && (
                <FreePanel freeSlots={freeSlots} selectedDate={selectedDate} blockingSlot={blockingSlot} blockingDay={blockingDay} onBlockSlot={handleBlockSlot} onBlockDay={() => blockEntireDay(selectedDate, freeSlots, loadData)} />
              )}
              {m.filter === 'blocked' && (
                <BlockedPanel blockedBookings={blockedBookings} blockingDay={blockingDay} onUnblock={(b) => setUnblockingBooking(b)} onUnblockDay={() => unblockEntireDay(blockedBookings, loadData)} />
              )}
            </div>
          )}
        </div>
      </div>

      {m.isDesktop && <AnimatePresence>{m.selectedBooking && <div className="fixed inset-0 z-[200] flex justify-end"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePanel} className="absolute inset-0 bg-black/60 backdrop-blur-sm" /><motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative w-[400px] h-full bg-[#0E0E0E] border-l border-white/[0.06] shadow-2xl overflow-hidden flex flex-col">{renderDetailPanel()}</motion.div></div>}</AnimatePresence>}

      <CompleteModal booking={m.completingBooking} onConfirm={m.handleComplete} onCancel={() => m.setCompletingBooking(null)} />
      <UnblockModal booking={unblockingBooking} onConfirm={confirmUnblock} onCancel={() => setUnblockingBooking(null)} />
      <DeleteModal booking={m.bookingToDelete} onConfirm={m.confirmDelete} onCancel={() => m.setBookingToDelete(null)} />

      {!m.isDesktop && <AnimatePresence>{m.selectedBooking && <div className="fixed inset-0 z-[200] flex flex-col justify-end"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePanel} className="absolute inset-0 bg-black/90 backdrop-blur-md" /><motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="relative w-full h-[100dvh] bg-[#0f0f0f] z-10 flex flex-col text-left overflow-hidden">{renderDetailPanel()}</motion.div></div>}</AnimatePresence>}

      <ToastNotification toast={m.toast} />
    </AdminLayout>
  );
};

export default AdminDashboard;
