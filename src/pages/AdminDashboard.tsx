import React, { useState, useEffect } from 'react';
import { getAvailableSlots } from '../lib/api';
import { getLocalDateString, getTimeSlotsForDate } from '../lib/utils';
import { useBookings } from '../hooks/useBookings';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import { useBookingManagement } from '../hooks/useBookingManagement';
import AdminLayout from '../components/Admin/AdminLayout';
import DashboardHeader from '../components/Admin/shared/DashboardHeader';
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
import { SkeletonDashboard } from '../components/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const selectedDate = getLocalDateString();
  const { bookings, loading, refetch: loadData } = useBookings(selectedDate);
  const mgmt = useBookingManagement(loadData);
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
    if (!mgmt.selectedBooking) return null;
    return mgmt.isRescheduling ? (
      <RescheduleWizard selectedBooking={mgmt.selectedBooking} services={mgmt.services} step={mgmt.rescheduleStep} setStep={mgmt.setRescheduleStep} rescheduleServices={mgmt.rescheduleServices} setRescheduleServices={mgmt.setRescheduleServices} rescheduleDate={mgmt.rescheduleDate} setRescheduleDate={mgmt.setRescheduleDate} rescheduleTime={mgmt.rescheduleTime} setRescheduleTime={mgmt.setRescheduleTime} existingBookings={mgmt.existingBookingsForReschedule} loadingSlots={mgmt.loadingSlots} isSaving={mgmt.isSavingReschedule} onConfirm={mgmt.handleConfirmReschedule} onClose={() => { mgmt.setSelectedBooking(null); mgmt.cancelReschedule(); }} />
    ) : (
      <BookingDetailPanel booking={mgmt.selectedBooking} services={mgmt.services} onClose={() => mgmt.setSelectedBooking(null)} onComplete={() => mgmt.setCompletingBooking(mgmt.selectedBooking)} onReschedule={mgmt.handleStartReschedule} onDelete={() => mgmt.setBookingToDelete(mgmt.selectedBooking)} />
    );
  };

  const closePanel = () => { mgmt.setSelectedBooking(null); mgmt.cancelReschedule(); };

  return (
    <AdminLayout mainClassName="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-8 pb-40 transition-all duration-300 max-w-5xl">
      <div className="space-y-5">
        <div className="space-y-5">
          <DashboardHeader
            nextBooking={nextBooking}
            dailyRevenue={dailyRevenue}
            onSelectNext={() => nextBooking && mgmt.setSelectedBooking(nextBooking)}
          />

          <div className="flex border-b border-white/[0.04] pb-1 pt-1 justify-start">
            <FilterTabs filter={mgmt.filter} setFilter={mgmt.setFilter} layoutId="dailyFilter" occupiedCount={occupiedBookings.length} freeCount={freeSlots.length} blockedCount={blockedBookings.length} />
          </div>

          {loading ? (
            <SkeletonDashboard />
          ) : (
            <div className="pt-2">
              {mgmt.filter === 'occupied' && (
                <OccupiedPanel bookings={occupiedBookings} selectedId={mgmt.selectedBooking?.id ?? null} onSelect={mgmt.setSelectedBooking} onComplete={(b) => mgmt.setCompletingBooking(b)} />
              )}
              {mgmt.filter === 'free' && (
                <FreePanel freeSlots={freeSlots} selectedDate={selectedDate} blockingSlot={blockingSlot} blockingDay={blockingDay} onBlockSlot={handleBlockSlot} onBlockDay={() => blockEntireDay(selectedDate, freeSlots, loadData)} />
              )}
              {mgmt.filter === 'blocked' && (
                <BlockedPanel blockedBookings={blockedBookings} blockingDay={blockingDay} onUnblock={(b) => setUnblockingBooking(b)} onUnblockDay={() => unblockEntireDay(blockedBookings, loadData)} />
              )}
            </div>
          )}
        </div>
      </div>

      {mgmt.isDesktop && <AnimatePresence>{mgmt.selectedBooking && <div className="fixed inset-0 z-[200] flex justify-end"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePanel} className="absolute inset-0 bg-black/60 backdrop-blur-sm" /><motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative w-[400px] h-full bg-[#0E0E0E] border-l border-white/[0.06] shadow-2xl overflow-hidden flex flex-col">{renderDetailPanel()}</motion.div></div>}</AnimatePresence>}

      <CompleteModal booking={mgmt.completingBooking} onConfirm={mgmt.handleComplete} onCancel={() => mgmt.setCompletingBooking(null)} />
      <UnblockModal booking={unblockingBooking} onConfirm={confirmUnblock} onCancel={() => setUnblockingBooking(null)} />
      <DeleteModal booking={mgmt.bookingToDelete} onConfirm={mgmt.confirmDelete} onCancel={() => mgmt.setBookingToDelete(null)} />

      {!mgmt.isDesktop && <AnimatePresence>{mgmt.selectedBooking && <div className="fixed inset-0 z-[200] flex flex-col justify-end"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePanel} className="absolute inset-0 bg-black/90 backdrop-blur-md" /><motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="relative w-full h-[100dvh] bg-[#0f0f0f] z-10 flex flex-col text-left overflow-hidden">{renderDetailPanel()}</motion.div></div>}</AnimatePresence>}

      <ToastNotification toast={mgmt.toast} />
    </AdminLayout>
  );
};

export default AdminDashboard;
