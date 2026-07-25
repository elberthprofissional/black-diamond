import { type FC, useState } from 'react';
import { useBookingManagement } from '../hooks/useBookingManagement';
import { useDashboardData } from '../hooks/useDashboardData';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { useBarberContext } from '../contexts/BarberContext';
import { useDayStatus } from '../hooks/useDayStatus';
import { useBookingStatusCounts } from '../hooks/useBookingStatusCounts';
import AdminLayout from '../components/Admin/AdminLayout';
import DashboardHeader from '../components/Admin/shared/DashboardHeader';
import OfflineBanner from '../components/Admin/shared/OfflineBanner';
import FilterTabs from '../components/Admin/shared/FilterTabs';
import OccupiedPanel from '../components/Admin/shared/OccupiedPanel';
import FreePanel from '../components/Admin/shared/FreePanel';
import BlockedPanel from '../components/Admin/shared/BlockedPanel';
import AdminBookingShell from '../components/Admin/shared/AdminBookingShell';
import ClosedDayView from '../components/Admin/shared/ClosedDayView';
import EndOfDayView from '../components/Admin/shared/EndOfDayView';
import BarberFilter from '../components/Admin/dashboard/BarberFilter';
import DaySummary from '../components/Admin/dashboard/DaySummary';
import DayOffButton from '../components/Admin/shared/DayOffButton';
import { SkeletonDashboard } from '../components/Skeleton';

const AdminDashboard: FC = () => {
  const { currentBarber, isOwner, barbers } = useBarberContext();
  const { barberHours } = useBarberSettings();
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>('all');

  const barberFilter = isOwner
    ? selectedBarberFilter === 'all'
      ? undefined
      : selectedBarberFilter
    : currentBarber?.id;

  const data = useDashboardData(barberFilter);
  const mgmt = useBookingManagement(data.loadData);
  const dayStatus = useDayStatus(barberHours);
  const statusCounts = useBookingStatusCounts(data.bookings);

  const showFilterTabs = !data.loading && !dayStatus.isClosed && !dayStatus.isPastClosing;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <OfflineBanner isCached={data.isCached} onRetry={data.loadData} />

        {isOwner && barbers.length > 1 && (
          <BarberFilter
            selectedBarberId={selectedBarberFilter}
            onSelect={setSelectedBarberFilter}
            barbers={barbers}
          />
        )}

        <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <h1 className="text-lg lg:text-2xl font-bold tracking-tight text-white uppercase shrink-0">
            Agenda do Dia
          </h1>
          <div className="flex items-center gap-3">
            <DaySummary
              totalCount={data.bookings.length}
              completedCount={statusCounts.completedCount}
              noShowCount={statusCounts.noShowCount}
            />
            {!data.loading && !dayStatus.isClosed && !dayStatus.isPastClosing && (
              <DayOffButton
                isBlocked={data.blockedBookings.length > 0}
                freeSlotsCount={data.freeSlots.length}
                blockedCount={data.blockedBookings.length}
                loading={data.loading}
                onBlockDay={() =>
                  data.blockEntireDay(data.selectedDate, data.freeSlots, data.loadData)
                }
                onUnblockDay={() => data.unblockEntireDay(data.blockedBookings, data.loadData)}
              />
            )}
          </div>
        </div>

        <DashboardHeader
          nextBooking={data.nextBooking}
          dailyRevenue={data.dailyRevenue}
          onSelectNext={() => data.nextBooking && mgmt.setSelectedBooking(data.nextBooking)}
        />

        {showFilterTabs && (
          <FilterTabs
            filter={mgmt.filter}
            setFilter={mgmt.setFilter}
            layoutId="dailyFilter"
            occupiedCount={data.occupiedBookings.length}
            freeCount={data.freeSlots.length}
            blockedCount={data.blockedBookings.length}
          />
        )}

        {data.loading ? (
          <SkeletonDashboard />
        ) : dayStatus.isClosed ? (
          <ClosedDayView />
        ) : dayStatus.isPastClosing ? (
          <EndOfDayView
            completedCount={statusCounts.completedCount}
            dailyRevenue={data.dailyRevenue}
          />
        ) : (
          <div className="pt-1">
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
        )}
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
