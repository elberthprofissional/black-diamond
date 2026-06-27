import { useState } from 'react';
import { toggleSlotBlock, unblockDay } from '../lib/api';
import { useToast } from './useToast';
import type { BookingWithClient } from '../types';

export function useSlotBlocking() {
  const [blockingSlot, setBlockingSlot] = useState<string | null>(null);
  const [unblockingBooking, setUnblockingBooking] = useState<BookingWithClient | null>(null);
  const [blockingDay, setBlockingDay] = useState(false);
  const { showSuccess, showError } = useToast();

  const blockSlot = async (date: string, slot: string, onBlockComplete?: () => Promise<void> | void, customKey?: string) => {
    setBlockingSlot(customKey || slot);
    try {
      await toggleSlotBlock(date, slot);
      if (onBlockComplete) {
        await onBlockComplete();
      }
      showSuccess(`Horário ${slot} bloqueado com sucesso!`);
    } catch {
      showError('Erro ao bloquear horário.');
    } finally {
      setBlockingSlot(null);
    }
  };

  const unblockSlot = async (_bookingId: string, onUnblockComplete?: () => Promise<void> | void) => {
    try {
      const booking = unblockingBooking;
      if (booking) {
        await toggleSlotBlock(booking.booking_date, booking.booking_time.slice(0, 5));
      }
      setUnblockingBooking(null);
      if (onUnblockComplete) {
        await onUnblockComplete();
      }
      showSuccess('Horário liberado com sucesso!');
    } catch {
      showError('Erro ao desbloquear horário.');
    }
  };

  const blockEntireDay = async (date: string, freeSlots: string[], onComplete?: () => Promise<void> | void) => {
    if (freeSlots.length === 0) return;
    setBlockingDay(true);
    try {
      for (const slot of freeSlots) {
        await toggleSlotBlock(date, slot);
      }
      if (onComplete) {
        await onComplete();
      }
      showSuccess('Dia bloqueado com sucesso!');
    } catch {
      showError('Erro ao bloquear o dia.');
    } finally {
      setBlockingDay(false);
    }
  };

  const unblockEntireDay = async (blockedBookings: BookingWithClient[], onComplete?: () => Promise<void> | void) => {
    if (blockedBookings.length === 0) return;
    setBlockingDay(true);
    try {
      const date = blockedBookings[0]?.booking_date;
      if (date) {
        await unblockDay(date);
      }
      if (onComplete) {
        await onComplete();
      }
      showSuccess('Dia liberado com sucesso!');
    } catch {
      showError('Erro ao liberar o dia.');
    } finally {
      setBlockingDay(false);
    }
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
    unblockEntireDay
  };
}
