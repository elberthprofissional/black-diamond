import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toggleSlotBlock, unblockDay } from '../lib/api';
import { useToast } from './useToast';
import { logError } from '../lib/logger';
import type { BookingWithClient } from '../types';

export function useSlotBlocking() {
  const [blockingSlot, setBlockingSlot] = useState<string | null>(null);
  const [unblockingBooking, setUnblockingBooking] = useState<BookingWithClient | null>(null);
  const [blockingDay, setBlockingDay] = useState(false);
  const { showSuccess, showError } = useToast();

  // Bloquear um slot individual
  const blockSlotMutation = useMutation({
    mutationFn: async ({ date, slot }: { date: string; slot: string }) => {
      await toggleSlotBlock(date, slot);
    },
    onSuccess: (_data, { slot }) => {
      showSuccess(`Horário ${slot} bloqueado com sucesso!`);
    },
    onError: (e) => {
      logError(e, 'useSlotBlocking/blockSlot');
      showError('Erro ao bloquear horário.');
    },
    onSettled: () => {
      setBlockingSlot(null);
    },
  });

  // Desbloquear um slot individual
  const unblockSlotMutation = useMutation({
    mutationFn: async (booking: BookingWithClient) => {
      await toggleSlotBlock(booking.booking_date, booking.booking_time.slice(0, 5));
    },
    onSuccess: () => {
      showSuccess('Horário liberado com sucesso!');
    },
    onError: (e) => {
      logError(e, 'useSlotBlocking/unblockSlot');
      showError('Erro ao desbloquear horário.');
    },
    onSettled: () => {
      setUnblockingBooking(null);
    },
  });

  // Bloquear dia inteiro
  const blockDayMutation = useMutation({
    mutationFn: async ({ date, freeSlots }: { date: string; freeSlots: string[] }) => {
      for (const slot of freeSlots) {
        await toggleSlotBlock(date, slot);
      }
    },
    onSuccess: () => {
      showSuccess('Dia bloqueado com sucesso!');
    },
    onError: (e) => {
      logError(e, 'useSlotBlocking/blockEntireDay');
      showError('Erro ao bloquear o dia.');
    },
    onSettled: () => {
      setBlockingDay(false);
    },
  });

  // Desbloquear dia inteiro
  const unblockDayMutation = useMutation({
    mutationFn: async (date: string) => {
      await unblockDay(date);
    },
    onSuccess: () => {
      showSuccess('Dia liberado com sucesso!');
    },
    onError: (e) => {
      logError(e, 'useSlotBlocking/unblockEntireDay');
      showError('Erro ao liberar o dia.');
    },
    onSettled: () => {
      setBlockingDay(false);
    },
  });

  const blockSlot = async (
    date: string,
    slot: string,
    onBlockComplete?: () => Promise<void> | void,
    customKey?: string
  ) => {
    setBlockingSlot(customKey || slot);
    await blockSlotMutation.mutateAsync({ date, slot });
    await onBlockComplete?.();
  };

  const unblockSlot = async (
    _bookingId: string,
    onUnblockComplete?: () => Promise<void> | void
  ) => {
    const booking = unblockingBooking;
    if (!booking) return;
    await unblockSlotMutation.mutateAsync(booking);
    await onUnblockComplete?.();
  };

  const blockEntireDay = async (
    date: string,
    freeSlots: string[],
    onComplete?: () => Promise<void> | void
  ) => {
    if (freeSlots.length === 0) return;
    setBlockingDay(true);
    await blockDayMutation.mutateAsync({ date, freeSlots });
    await onComplete?.();
  };

  const unblockEntireDay = async (
    blockedBookings: BookingWithClient[],
    onComplete?: () => Promise<void> | void
  ) => {
    if (blockedBookings.length === 0) return;
    setBlockingDay(true);
    const date = blockedBookings[0]?.booking_date;
    if (date) {
      await unblockDayMutation.mutateAsync(date);
    }
    await onComplete?.();
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
