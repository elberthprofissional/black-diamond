import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAvailableSlots } from '../lib/api';
import { getLocalDateString, getTimeSlotsForDate } from '../lib/utils';
import { useBookings } from './useBookings';
import { useSlotBlocking } from './useSlotBlocking';
import type { BookingWithClient } from '../types';

export function useDashboardData() {
  const selectedDate = getLocalDateString();
  const { bookings, loading, refetch: loadData } = useBookings(selectedDate);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

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

  useEffect(() => {
    let active = true;
    const loadAvailableSlots = async () => {
      try {
        const slots = await getAvailableSlots(selectedDate);
        if (active) setAvailableSlots(slots);
      } catch {
        try {
          const fallbackSlots = await getTimeSlotsForDate(selectedDate);
          if (active) setAvailableSlots(fallbackSlots);
        } catch {
          if (active) setAvailableSlots([]);
        }
      }
    };
    loadAvailableSlots();
    return () => {
      active = false;
    };
  }, [selectedDate]);

  const handleBlockSlot = useCallback(
    async (slot: string) => {
      await blockSlot(selectedDate, slot, loadData);
    },
    [blockSlot, selectedDate, loadData]
  );

  const confirmUnblock = useCallback(async () => {
    if (!unblockingBooking) return;
    await unblockSlot(unblockingBooking.id, loadData);
  }, [unblockingBooking, unblockSlot, loadData]);

  const { dailyRevenue, occupiedBookings, blockedBookings, freeSlots, nextBooking } =
    useMemo(() => {
      const dailyRevenue = bookings
        .filter((b) => b.status === 'completed' || b.status === 'confirmed')
        .reduce((sum, b) => sum + (b.total_price || 0), 0);

      const occupiedBookings = bookings.filter(
        (b) => b.status !== 'completed' && b.status !== 'cancelled' && !b.is_blocked
      );
      const blockedBookings = bookings.filter((b) => b.status !== 'cancelled' && b.is_blocked);

      const isTimeOccupied = (time: string) =>
        bookings.some((b) => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === time);
      const freeSlots = availableSlots.filter((slot) => !isTimeOccupied(slot));

      const now = new Date();
      const currentTime =
        now.getHours().toString().padStart(2, '0') +
        ':' +
        now.getMinutes().toString().padStart(2, '0');
      const nextBooking: BookingWithClient | null =
        bookings
          .filter((b) => b.status !== 'cancelled' && b.booking_time >= currentTime && !b.is_blocked)
          .sort((a, b) => a.booking_time.localeCompare(b.booking_time))[0] || null;

      return { dailyRevenue, occupiedBookings, blockedBookings, freeSlots, nextBooking };
    }, [bookings, availableSlots]);

  return {
    selectedDate,
    bookings,
    loading,
    loadData,
    availableSlots,
    dailyRevenue,
    occupiedBookings,
    blockedBookings,
    freeSlots,
    nextBooking,
    blockingSlot,
    unblockingBooking,
    setUnblockingBooking,
    handleBlockSlot,
    confirmUnblock,
    blockingDay,
    blockEntireDay,
    unblockEntireDay,
  };
}
