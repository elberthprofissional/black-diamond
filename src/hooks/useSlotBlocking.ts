import { useState } from 'react';
import { toggleSlotBlock, unblockDay } from '../lib/api';
import { useToast } from './useToast';
import { logError } from '../lib/logger';
import type { BookingWithClient } from '../types';

export function useSlotBlocking() {
  const [blockingSlot, setBlockingSlot] = useState<string | null>(null);
  const [unblockingBooking, setUnblockingBooking] = useState<BookingWithClient | null>(null);
  const [blockingDay, setBlockingDay] = useState(false);
  const { showSuccess, showError } = useToast();

  const blockSlot = async (
    date: string,
    slot: string,
    onBlockComplete?: () => Promise<void> | void,
    customKey?: string
  ) => {
    setBlockingSlot(customKey || slot);
    try {
      await toggleSlotBlock(date, slot);
      if (onBlockComplete) await onBlockComplete();
      showSuccess(`Horário ${slot} bloqueado com sucesso!`);
    } catch (e) {
      logError(e, 'useSlotBlocking/blockSlot');
      showError('Erro ao bloquear horário.');
    }
    setBlockingSlot(null);
  };

  const unblockSlot = async (
    _bookingId: string,
    onUnblockComplete?: () => Promise<void> | void
  ) => {
    try {
      const booking = unblockingBooking;
      if (booking) {
        await toggleSlotBlock(booking.booking_date, booking.booking_time.slice(0, 5));
      }
      setUnblockingBooking(null);
      if (onUnblockComplete) await onUnblockComplete();
      showSuccess('Horário liberado com sucesso!');
    } catch (e) {
      logError(e, 'useSlotBlocking/unblockSlot');
      showError('Erro ao desbloquear horário.');
    }
  };

  const blockEntireDay = async (
    date: string,
    freeSlots: string[],
    onComplete?: () => Promise<void> | void
  ) => {
    if (freeSlots.length === 0) return;
    setBlockingDay(true);
    try {
      for (const slot of freeSlots) {
        await toggleSlotBlock(date, slot);
      }
      if (onComplete) await onComplete();
      showSuccess('Dia bloqueado com sucesso!');
    } catch (e) {
      logError(e, 'useSlotBlocking/blockEntireDay');
      showError('Erro ao bloquear o dia.');
    }
    setBlockingDay(false);
  };

  const unblockEntireDay = async (
    blockedBookings: BookingWithClient[],
    onComplete?: () => Promise<void> | void
  ) => {
    if (blockedBookings.length === 0) return;
    setBlockingDay(true);
    try {
      const date = blockedBookings[0]?.booking_date;
      if (date) await unblockDay(date);
      if (onComplete) await onComplete();
      showSuccess('Dia liberado com sucesso!');
    } catch (e) {
      logError(e, 'useSlotBlocking/unblockEntireDay');
      showError('Erro ao liberar o dia.');
    }
    setBlockingDay(false);
  };

  return {
    blockingSlot,
    setBlockingSlot,
    unblockingBooking,
    setUnblockingBooking,
    blockingDay,
    blockSlot,
    unblockSlot,
    blockEntireDay,
    unblockEntireDay,
  };
}
