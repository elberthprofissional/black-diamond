import { useState, useMemo, useEffect, useCallback, type FC } from 'react';
import { useBarberContext } from '../contexts/BarberContext';
import { useBookings } from '../hooks/useBookings';
import { useBookingModals } from '../hooks/useBookingModals';
import { useServices } from '../hooks/useServices';
import { useDayStatus } from '../hooks/useDayStatus';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { useNoShow } from '../hooks/useNoShow';
import { getLocalDateString, formatDisplayName, formatPricePublic } from '../lib/utils';
import AdminLayout from '../components/Admin/AdminLayout';
import OfflineBanner from '../components/Admin/shared/OfflineBanner';
import FilterTabs from '../components/Admin/shared/FilterTabs';
import BookingDetailPanel from '../components/Admin/shared/BookingDetailPanel';
import DashboardHeader from '../components/Admin/shared/DashboardHeader';
import FreePanel from '../components/Admin/shared/FreePanel';
import BlockedPanel from '../components/Admin/shared/BlockedPanel';
import UnblockModal from '../components/Admin/shared/UnblockModal';
import DeleteModal from '../components/Admin/shared/DeleteModal';
import { SkeletonDashboard } from '../components/Skeleton';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import { AnimatePresence } from 'framer-motion';
import type { BookingWithClient } from '../types';

const BarberDashboard: FC = () => {
  const { currentBarber } = useBarberContext();
  const barberId = currentBarber?.id;
  const { barberHours } = useBarberSettings();
  const { services } = useServices();
  const dayStatus = useDayStatus(barberHours);

  const today = getLocalDateString(new Date());
  const { bookings, loading, isCached, refetch: loadData } = useBookings(today, barberId);

  const mgmt = useBookingModals(loadData, services);
  const noShow = useNoShow({ onBookingUpdated: loadData });
  const { blockingSlot, unblockingBooking, setUnblockingBooking, unblockSlot, blockSlot } =
    useSlotBlocking();

  const confirmUnblock = useCallback(async () => {
    if (!unblockingBooking) return;
    await unblockSlot(unblockingBooking.id, loadData);
  }, [unblockingBooking, unblockSlot, loadData]);

  const [filter, setFilter] = useState<'occupied' | 'free' | 'blocked'>('occupied');

  // Metrics
  const dailyRevenue = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price || 0), 0),
    [bookings]
  );

  const completedCount = useMemo(
    () => bookings.filter((b) => b.status === 'completed').length,
    [bookings]
  );

  const pendingCount = useMemo(
    () =>
      bookings.filter((b) => (b.status === 'confirmed' || b.status === 'pending') && !b.is_blocked)
        .length,
    [bookings]
  );

  const occupiedBookings = useMemo(
    () =>
      bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled' && !b.is_blocked),
    [bookings]
  );

  const blockedBookings = useMemo(
    () => bookings.filter((b) => b.status !== 'cancelled' && b.is_blocked),
    [bookings]
  );

  const freeSlots = useMemo(() => {
    const allSlots: string[] = [];
    if (!barberHours) return allSlots;
    try {
      const parsed = JSON.parse(barberHours);
      const day = new Date().getDay();
      const config = parsed[String(day)];
      if (!config?.enabled) return allSlots;
      const open = config.open || '08:00';
      const close = config.close || '18:00';
      let [h] = open.split(':').map(Number);
      const [, endH] = close.split(':').map(Number);
      while (h < endH) {
        const slot = `${String(h).padStart(2, '0')}:00`;
        const isOccupied = bookings.some(
          (b) => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === slot
        );
        if (!isOccupied) allSlots.push(slot);
        h++;
      }
    } catch {
      // fallback
    }
    return allSlots;
  }, [barberHours, bookings]);

  // Auto-confirma cancelamento quando BookingDetailPanel chama onDelete
  useEffect(() => {
    if (mgmt.bookingToDelete) {
      mgmt.confirmDelete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgmt.bookingToDelete, mgmt.confirmDelete]);

  const handleBlockSlotWrapper = async (slot: string) => {
    await blockSlot(today, slot, loadData);
  };

  return (
    <AdminLayout
      hideBottomTabs={false}
      mainClassName="w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-8 pb-40 max-w-[900px]"
    >
      <div className="space-y-6">
        <OfflineBanner isCached={isCached} onRetry={loadData} />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div>
            <h1 className="text-xl font-bold text-white">
              Olá, {currentBarber?.name?.split(' ')[0] || 'Barbeiro'} 👋
            </h1>
            <p className="text-[12px] text-zinc-500 mt-1">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-[#D4AF37]">{pendingCount}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Pendentes</p>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">{completedCount}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Finalizados</p>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="text-center">
              <p className="text-lg font-bold text-white tabular-nums">
                {formatPricePublic(dailyRevenue)}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Faturamento</p>
            </div>
          </div>
        </div>

        {/* Next Booking */}
        {!loading && pendingCount > 0 && (
          <DashboardHeader
            nextBooking={
              occupiedBookings.sort((a, b) => a.booking_time.localeCompare(b.booking_time))[0] ||
              null
            }
            dailyRevenue={dailyRevenue}
            onSelectNext={() => {
              const next = occupiedBookings.sort((a, b) =>
                a.booking_time.localeCompare(b.booking_time)
              )[0];
              if (next) mgmt.setSelectedBooking(next);
            }}
          />
        )}

        {/* Filter Tabs */}
        {!loading && !dayStatus.isClosed && (
          <FilterTabs
            filter={filter}
            setFilter={setFilter}
            layoutId="barberFilter"
            occupiedCount={occupiedBookings.length}
            freeCount={freeSlots.length}
            blockedCount={blockedBookings.length}
          />
        )}

        {/* Content */}
        {loading ? (
          <SkeletonDashboard />
        ) : (
          <div className="pt-1">
            {/* Occupied */}
            {filter === 'occupied' && (
              <div className="space-y-2">
                {occupiedBookings.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[14px] text-zinc-500">Nenhum agendamento pendente</p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Aproveite para organizar o salão!
                    </p>
                  </div>
                ) : (
                  occupiedBookings.map((booking) => (
                    <div
                      key={booking.id}
                      onClick={() => mgmt.setSelectedBooking(booking)}
                      className="flex items-center rounded-lg border border-white/5 bg-[#111111] p-3 hover:bg-white/[0.03] cursor-pointer transition-all"
                    >
                      <span className="text-sm font-bold text-zinc-400 tabular-nums w-10 shrink-0">
                        {booking.booking_time.slice(0, 5)}
                      </span>
                      <div className="w-px h-3.5 bg-white/10 mx-3 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-white truncate">
                          {formatDisplayName(booking.clients?.name)}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {booking.status === 'completed' ? '✅ Finalizado' : '⏳ Pendente'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {booking.status !== 'completed' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                noShow.markAsNoShow(
                                  booking.id,
                                  booking.clients?.name || 'Cliente',
                                  booking.client_id,
                                  booking.clients?.phone
                                );
                              }}
                              disabled={noShow.markingNoShow === booking.id}
                              className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400/70 text-[9px] font-bold hover:bg-orange-500/20 transition-all cursor-pointer disabled:opacity-30"
                            >
                              Falta
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                mgmt.setCompletingBooking(booking);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-all cursor-pointer"
                            >
                              Finalizar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Free */}
            {filter === 'free' && (
              <FreePanel
                freeSlots={freeSlots}
                selectedDate={today}
                blockingSlot={blockingSlot}
                blockingDay={false}
                onBlockSlot={handleBlockSlotWrapper}
                onBlockDay={() => {}}
              />
            )}

            {/* Blocked */}
            {filter === 'blocked' && (
              <BlockedPanel
                blockedBookings={blockedBookings}
                blockingDay={false}
                onUnblock={(b) => setUnblockingBooking(b)}
                onUnblockDay={() => {}}
              />
            )}
          </div>
        )}
      </div>

      {/* Booking Detail Panel */}
      <AnimatePresence>
        {mgmt.selectedBooking && (
          <BookingDetailPanel
            booking={mgmt.selectedBooking}
            services={services}
            onClose={() => mgmt.setSelectedBooking(null)}
            onComplete={() => {
              mgmt.setCompletingBooking(mgmt.selectedBooking);
            }}
            onReschedule={() => {
              // Reschedule via dashboard not available in simplified view
              mgmt.setSelectedBooking(null);
            }}
            onDelete={() => {
              mgmt.setBookingToDelete(mgmt.selectedBooking);
            }}
            onUnblock={() => {
              setUnblockingBooking(mgmt.selectedBooking as BookingWithClient);
            }}
            onBookingUpdated={loadData}
          />
        )}
      </AnimatePresence>

      {/* Complete Modal */}
      {mgmt.completingBooking && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60"
          onClick={() => mgmt.setCompletingBooking(null)}
        >
          <div
            className="bg-[#1A1A1A] rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-[16px] font-bold text-white mb-1">Finalizar Atendimento?</p>
              <p className="text-[12px] text-zinc-400">
                {formatDisplayName(mgmt.completingBooking.clients?.name)} às{' '}
                {mgmt.completingBooking.booking_time.slice(0, 5)}
              </p>
            </div>
            <div className="border-t border-white/[0.06] flex">
              <button
                onClick={() => mgmt.setCompletingBooking(null)}
                className="flex-1 py-3.5 text-[12px] font-bold text-zinc-400 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <div className="w-px bg-white/[0.06]" />
              <button
                onClick={mgmt.handleComplete}
                className="flex-1 py-3.5 text-[12px] font-bold text-emerald-400 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Modal */}
      {mgmt.thankYouBooking && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60"
          onClick={mgmt.handleCancelThankYou}
        >
          <div
            className="bg-[#1A1A1A] rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <p className="text-[16px] font-bold text-white mb-2">Enviar agradecimento?</p>
              <p className="text-[12px] text-zinc-400">
                Abrir WhatsApp para agradecer{' '}
                {formatDisplayName(mgmt.thankYouBooking.clients?.name)}?
              </p>
            </div>
            <div className="border-t border-white/[0.06] flex">
              <button
                onClick={mgmt.handleCancelThankYou}
                className="flex-1 py-3.5 text-[12px] font-bold text-zinc-400 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                Pular
              </button>
              <div className="w-px bg-white/[0.06]" />
              <button
                onClick={mgmt.handleSendThankYou}
                className="flex-1 py-3.5 text-[12px] font-bold text-emerald-400 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Modal */}
      <UnblockModal
        booking={unblockingBooking}
        onConfirm={confirmUnblock}
        onCancel={() => setUnblockingBooking(null)}
      />

      {/* Delete Modal */}
      <DeleteModal
        booking={mgmt.bookingToDelete}
        onConfirm={mgmt.confirmDelete}
        onCancel={() => mgmt.setBookingToDelete(null)}
      />

      <ToastNotification toast={mgmt.toast} />
    </AdminLayout>
  );
};

export default BarberDashboard;
