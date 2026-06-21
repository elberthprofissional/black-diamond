import { useState } from 'react';
import { createBooking, updateBookingStatus } from '../lib/api';
import { useToast } from './useToast';
import type { BookingWithClient } from '../types';

export function useSlotBlocking() {
  const [blockingSlot, setBlockingSlot] = useState<string | null>(null);
  const [unblockingBooking, setUnblockingBooking] = useState<BookingWithClient | null>(null);
  const { showSuccess, showError } = useToast();

  const blockSlot = async (date: string, slot: string, onBlockComplete?: () => Promise<void> | void, customKey?: string) => {
    setBlockingSlot(customKey || slot);
    try {
      await createBooking(
        {
          service_ids: [],
          booking_date: date,
          booking_time: slot,
          total_price: 0,
          total_duration: 0
        },
        {
          name: 'BLOQUEADO',
          phone: '00000000000'
        }
      );
      if (onBlockComplete) {
        await onBlockComplete();
      }
      showSuccess(`Horário ${slot} bloqueado com sucesso!`);
    } catch (error) {
      console.error(error);
      showError('Erro ao bloquear horário.');
    } finally {
      setBlockingSlot(null);
    }
  };

  const unblockSlot = async (bookingId: string, onUnblockComplete?: () => Promise<void> | void) => {
    try {
      await updateBookingStatus(bookingId, 'cancelled');
      setUnblockingBooking(null);
      if (onUnblockComplete) {
        await onUnblockComplete();
      }
      showSuccess('Horário liberado com sucesso!');
    } catch (error) {
      console.error(error);
      showError('Erro ao desbloquear horário.');
    }
  };

  return {
    blockingSlot,
    setBlockingSlot,
    unblockingBooking,
    setUnblockingBooking,
    blockSlot,
    unblockSlot
  };
}
