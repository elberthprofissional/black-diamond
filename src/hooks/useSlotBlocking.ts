import { useState } from 'react';
import { createBooking, updateBookingStatus } from '../lib/api';
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

  const blockEntireDay = async (date: string, freeSlots: string[], onComplete?: () => Promise<void> | void) => {
    if (freeSlots.length === 0) return;
    setBlockingDay(true);
    try {
      await Promise.all(
        freeSlots.map(slot => 
          createBooking(
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
          )
        )
      );
      if (onComplete) {
        await onComplete();
      }
      showSuccess('Dia bloqueado com sucesso!');
    } catch (error) {
      console.error(error);
      showError('Erro ao bloquear o dia.');
    } finally {
      setBlockingDay(false);
    }
  };

  const unblockEntireDay = async (blockedBookings: BookingWithClient[], onComplete?: () => Promise<void> | void) => {
    if (blockedBookings.length === 0) return;
    setBlockingDay(true);
    try {
      await Promise.all(
        blockedBookings.map(booking => updateBookingStatus(booking.id, 'cancelled'))
      );
      if (onComplete) {
        await onComplete();
      }
      showSuccess('Dia liberado com sucesso!');
    } catch (error) {
      console.error(error);
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
