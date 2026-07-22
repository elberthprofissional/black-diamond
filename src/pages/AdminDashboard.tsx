import { type FC, useMemo } from 'react';
import { useBookingManagement } from '../hooks/useBookingManagement';
import { useDashboardData } from '../hooks/useDashboardData';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { useBarberContext } from '../contexts/BarberContext';
import AdminLayout from '../components/Admin/AdminLayout';
import DashboardHeader from '../components/Admin/shared/DashboardHeader';

import FilterTabs from '../components/Admin/shared/FilterTabs';
import OccupiedPanel from '../components/Admin/shared/OccupiedPanel';
import FreePanel from '../components/Admin/shared/FreePanel';
import BlockedPanel from '../components/Admin/shared/BlockedPanel';
import AdminBookingShell from '../components/Admin/shared/AdminBookingShell';
import ClosedDayView from '../components/Admin/shared/ClosedDayView';
import EndOfDayView from '../components/Admin/shared/EndOfDayView';
import { SkeletonDashboard } from '../components/Skeleton';
import { logError } from '../lib/logger';

const LAYOUT_CLASS =
  'flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-8 pb-40 transition-all duration-300 max-w-5xl';

const AdminDashboard: FC = () => {
  const { currentBarber, isOwner } = useBarberContext();
  // Owner sees all bookings; regular barbers see only their own
  const barberFilter = isOwner ? undefined : currentBarber?.id;
  const data = useDashboardData(barberFilter);
  const mgmt = useBookingManagement(data.loadData);
  const { barberHours } = useBarberSettings();

  const dayStatus = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    if (!barberHours) {
      return { isClosed: false, isPastClosing: false };
    }

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
    } catch (e) {
      logError(e);
      return { isClosed: false, isPastClosing: false };
    }
  }, [barberHours]);

  const completedCount = useMemo(
    () => data.bookings.filter((b) => b.status === 'completed').length,
    [data.bookings]
  );

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

      <AdminBookingShell
        selectedBooking={mgmt.selectedBooking}
        setSelectedBooking={mgmt.setSelectedBooking}
        services={mgmt.services}
        isDesktop={mgmt.isDesktop}
        reschedule={{
          isRescheduling: mgmt.isRescheduling,
          rescheduleStep: mgmt.rescheduleStep,
          setRescheduleStep: mgmt.setRescheduleStep,
          rescheduleServices: mgmt.rescheduleServices,
          setRescheduleServices: mgmt.setRescheduleServices,
          rescheduleDate: mgmt.rescheduleDate,
          setRescheduleDate: mgmt.setRescheduleDate,
          rescheduleTime: mgmt.rescheduleTime,
          setRescheduleTime: mgmt.setRescheduleTime,
          existingBookingsForReschedule: mgmt.existingBookingsForReschedule,
          loadingSlots: mgmt.loadingSlots,
          isSavingReschedule: mgmt.isSavingReschedule,
          handleConfirmReschedule: mgmt.handleConfirmReschedule,
          handleStartReschedule: mgmt.handleStartReschedule,
          cancelReschedule: mgmt.cancelReschedule,
        }}
        completingBooking={mgmt.completingBooking}
        setCompletingBooking={mgmt.setCompletingBooking}
        handleComplete={mgmt.handleComplete}
        thankYouBooking={mgmt.thankYouBooking}
        handleSendThankYou={mgmt.handleSendThankYou}
        handleCancelThankYou={mgmt.handleCancelThankYou}
        bookingToDelete={mgmt.bookingToDelete}
        setBookingToDelete={mgmt.setBookingToDelete}
        confirmDelete={mgmt.confirmDelete}
        unblockingBooking={data.unblockingBooking}
        setUnblockingBooking={data.setUnblockingBooking}
        confirmUnblock={data.confirmUnblock}
        toast={mgmt.toast}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
