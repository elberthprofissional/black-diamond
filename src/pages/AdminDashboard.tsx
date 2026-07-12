import { type FC, useMemo } from 'react';
import { useBookingManagement } from '../hooks/useBookingManagement';
import { useDashboardData } from '../hooks/useDashboardData';
import { useBarberSettings } from '../hooks/useBarberSettings';
import AdminLayout from '../components/Admin/AdminLayout';
import DashboardHeader from '../components/Admin/shared/DashboardHeader';
import OccupancyRateCard from '../components/Admin/shared/OccupancyRateCard';
import FilterTabs from '../components/Admin/shared/FilterTabs';
import OccupiedPanel from '../components/Admin/shared/OccupiedPanel';
import FreePanel from '../components/Admin/shared/FreePanel';
import BlockedPanel from '../components/Admin/shared/BlockedPanel';
import UnblockModal from '../components/Admin/shared/UnblockModal';
import CompleteModal from '../components/Admin/shared/CompleteModal';
import ThankYouModal from '../components/Admin/shared/ThankYouModal';
import DeleteModal from '../components/Admin/shared/DeleteModal';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import RescheduleWizard from '../components/Admin/shared/RescheduleWizard';
import BookingDetailPanel from '../components/Admin/shared/BookingDetailPanel';
import ClosedDayView from '../components/Admin/shared/ClosedDayView';
import EndOfDayView from '../components/Admin/shared/EndOfDayView';
import { SkeletonDashboard } from '../components/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const LAYOUT_CLASS =
  'flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-8 pb-40 transition-all duration-300 max-w-5xl';

const AdminDashboard: FC = () => {
  const data = useDashboardData();
  const mgmt = useBookingManagement(data.loadData);
  const { barberHours } = useBarberSettings();

  const dayStatus = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    try {
      const parsed = JSON.parse(barberHours);
      const config = parsed[String(dayOfWeek)];
      const isOpen = config?.enabled !== false;

      if (!isOpen) return { isClosed: true, isPastClosing: false };

      const closeStr = config?.close || '18:00';
      const [closeH, closeM] = closeStr.split(':').map(Number);
      const isPastClosing =
        currentHour > closeH || (currentHour === closeH && currentMinutes > closeM);

      return { isClosed: false, isPastClosing };
    } catch {
      return { isClosed: false, isPastClosing: false };
    }
  }, [barberHours]);

  const completedCount = useMemo(
    () => data.bookings.filter((b) => b.status === 'completed').length,
    [data.bookings]
  );

  const closePanel = () => {
    mgmt.setSelectedBooking(null);
    mgmt.cancelReschedule();
  };

  const renderDetailPanel = () => {
    if (!mgmt.selectedBooking) return null;

    if (mgmt.isRescheduling) {
      return (
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
      );
    }

    return (
      <BookingDetailPanel
        booking={mgmt.selectedBooking}
        services={mgmt.services}
        onClose={() => mgmt.setSelectedBooking(null)}
        onComplete={() => mgmt.setCompletingBooking(mgmt.selectedBooking)}
        onReschedule={mgmt.handleStartReschedule}
        onDelete={() => mgmt.setBookingToDelete(mgmt.selectedBooking)}
      />
    );
  };

  const renderDesktopPanel = () => {
    if (!mgmt.isDesktop || !mgmt.selectedBooking) return null;

    return (
      <AnimatePresence>
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
      </AnimatePresence>
    );
  };

  const renderMobilePanel = () => {
    if (mgmt.isDesktop || !mgmt.selectedBooking) return null;

    return (
      <AnimatePresence>
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
      </AnimatePresence>
    );
  };

  return (
    <AdminLayout mainClassName={LAYOUT_CLASS}>
      <div className="space-y-5">
        <div className="space-y-5">
          <DashboardHeader
            nextBooking={data.nextBooking}
            dailyRevenue={data.dailyRevenue}
            onSelectNext={() => data.nextBooking && mgmt.setSelectedBooking(data.nextBooking)}
          />

          {data.loading ? (
            <SkeletonDashboard />
          ) : dayStatus.isClosed ? (
            <ClosedDayView />
          ) : dayStatus.isPastClosing ? (
            <EndOfDayView completedCount={completedCount} dailyRevenue={data.dailyRevenue} />
          ) : (
            <>
              {/* Taxa de Ocupação */}
              <OccupancyRateCard
                occupiedCount={data.occupiedBookings.length}
                totalSlots={data.occupiedBookings.length + data.freeSlots.length}
              />

              <div className="flex border-b border-white/[0.04] pb-1 pt-1 justify-start">
                <FilterTabs
                  filter={mgmt.filter}
                  setFilter={mgmt.setFilter}
                  layoutId="dailyFilter"
                  occupiedCount={data.occupiedBookings.length}
                  freeCount={data.freeSlots.length}
                  blockedCount={data.blockedBookings.length}
                />
              </div>

              <div className="pt-2">
                {mgmt.filter === 'occupied' && (
                  <OccupiedPanel
                    bookings={data.occupiedBookings}
                    selectedId={mgmt.selectedBooking?.id ?? null}
                    onSelect={mgmt.setSelectedBooking}
                    onComplete={(b) => mgmt.setCompletingBooking(b)}
                  />
                )}
                {mgmt.filter === 'free' && (
                  <FreePanel
                    freeSlots={data.freeSlots}
                    selectedDate={data.selectedDate}
                    blockingSlot={data.blockingSlot}
                    blockingDay={data.blockingDay}
                    onBlockSlot={data.handleBlockSlot}
                    onBlockDay={() =>
                      data.blockEntireDay(data.selectedDate, data.freeSlots, data.loadData)
                    }
                  />
                )}
                {mgmt.filter === 'blocked' && (
                  <BlockedPanel
                    blockedBookings={data.blockedBookings}
                    blockingDay={data.blockingDay}
                    onUnblock={(b) => data.setUnblockingBooking(b)}
                    onUnblockDay={() => data.unblockEntireDay(data.blockedBookings, data.loadData)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {renderDesktopPanel()}

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
      <UnblockModal
        booking={data.unblockingBooking}
        onConfirm={data.confirmUnblock}
        onCancel={() => data.setUnblockingBooking(null)}
      />
      <DeleteModal
        booking={mgmt.bookingToDelete}
        onConfirm={mgmt.confirmDelete}
        onCancel={() => mgmt.setBookingToDelete(null)}
      />

      {renderMobilePanel()}

      <ToastNotification toast={mgmt.toast} />
    </AdminLayout>
  );
};

export default AdminDashboard;
