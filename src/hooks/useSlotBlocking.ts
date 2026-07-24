import { useState } from 'react';
import { toggleSlotBlock, unblockDay } from '../lib/api';
import { useToast } from './useToast';
import { handleAsyncError } from '../lib/errorHandler';
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
    const result = await handleAsyncError(
      async () => {
        await toggleSlotBlock(date, slot);
        if (onBlockComplete) await onBlockComplete();
        return true;
      },
      { context: 'useSlotBlocking/blockSlot', userMessage: 'Erro ao bloquear horário.', showError }
    );
    if (result) showSuccess(`Horário ${slot} bloqueado com sucesso!`);
    setBlockingSlot(null);
  };

  const unblockSlot = async (
    _bookingId: string,
    onUnblockComplete?: () => Promise<void> | void
  ) => {
    const result = await handleAsyncError(
      async () => {
        const booking = unblockingBooking;
        if (booking) {
          await toggleSlotBlock(booking.booking_date, booking.booking_time.slice(0, 5));
        }
        setUnblockingBooking(null);
        if (onUnblockComplete) await onUnblockComplete();
        return true;
      },
      { context: 'useSlotBlocking/unblockSlot', userMessage: 'Erro ao desbloquear horário.', showError }
    );
    if (result) showSuccess('Horário liberado com sucesso!');
  };

  const blockEntireDay = async (
    date: string,
    freeSlots: string[],
    onComplete?: () => Promise<void> | void
  ) => {
    if (freeSlots.length === 0) return;
    setBlockingDay(true);
    const result = await handleAsyncError(
      async () => {
        for (const slot of freeSlots) {
          await toggleSlotBlock(date, slot);
        }
        if (onComplete) await onComplete();
        return true;
      },
      { context: 'useSlotBlocking/blockEntireDay', userMessage: 'Erro ao bloquear o dia.', showError }
    );
    if (result) showSuccess('Dia bloqueado com sucesso!');
    setBlockingDay(false);
  };

  const unblockEntireDay = async (
    blockedBookings: BookingWithClient[],
    onComplete?: () => Promise<void> | void
  ) => {
    if (blockedBookings.length === 0) return;
    setBlockingDay(true);
    const result = await handleAsyncError(
      async () => {
        const date = blockedBookings[0]?.booking_date;
        if (date) await unblockDay(date);
        if (onComplete) await onComplete();
        return true;
      },
      { context: 'useSlotBlocking/unblockEntireDay', userMessage: 'Erro ao liberar o dia.', showError }
    );
    if (result) showSuccess('Dia liberado com sucesso!');
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
