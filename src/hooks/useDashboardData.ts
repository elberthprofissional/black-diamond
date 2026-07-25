import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getAvailableSlots } from '../lib/api';
import { getLocalDateString, getTimeSlotsForDate } from '../lib/utils';
import { useBookings } from './useBookings';
import { useSlotBlocking } from './useSlotBlocking';
import type { BookingWithClient } from '../types';
import { logError } from '../lib/logger';

/**
 * Hook principal do Dashboard do Admin.
 *
 * - Usa `useBookings` para carregar agendamentos do dia atual.
 * - Carrega slots disponíveis via API.
 * - Configura subscription Realtime (Supabase) para atualizações ao vivo.
 * - Expõe métricas calculadas: `dailyRevenue`, `occupiedBookings`, `freeSlots`, `nextBooking`.
 * - Fornece funções para bloquear/desbloquear horários inteiros ou slots individuais.
 *
 * @param barberId - ID do barbeiro (opcional, para filtrar agendamentos).
 * @returns Objeto com todos os estados e ações do dashboard.
 */
export function useDashboardData(barberId?: string) {
  const selectedDate = getLocalDateString();
  const { bookings, loading, isCached, refetch: loadData } = useBookings(selectedDate, barberId);
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

  // Carrega slots disponiveis com AbortController para evitar race condition
  const abortRef = useRef<AbortController | null>(null);
  const loadSlots = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const slots = await getAvailableSlots(selectedDate);
      if (controller.signal.aborted) return;
      setAvailableSlots(slots);
    } catch (e) {
      if (controller.signal.aborted) return;
      logError(e);
      try {
        const fallback = await getTimeSlotsForDate(selectedDate);
        if (controller.signal.aborted) return;
        setAvailableSlots(fallback);
      } catch (e) {
        if (controller.signal.aborted) return;
        logError(e);
        setAvailableSlots([]);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Realtime subscription para mudancas na tabela bookings
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 10;

  useEffect(() => {
    let mounted = true;

    const refreshDashboard = () => {
      loadData();
      loadSlots();
    };

    const setupRealtime = async () => {
      if (!mounted) return;

      // Remove canal anterior se existir
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel('dashboard-bookings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `booking_date=eq.${selectedDate}`,
          },
          () => {
            // Qualquer mudanca (INSERT/UPDATE/DELETE) atualiza o dashboard
            refreshDashboard();
          }
        )
        .subscribe((status) => {
          if (!mounted) return;

          if (status === 'SUBSCRIBED') {
            retryCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (retryCountRef.current < MAX_RETRIES) {
              const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 15000);
              retryCountRef.current++;

              if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
              retryTimerRef.current = setTimeout(() => {
                if (mounted) setupRealtime();
              }, delay);
            }
          }
        });

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(() => {});
        channelRef.current = null;
      }
    };
  }, [selectedDate, loadData, loadSlots]);

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
        .filter((b) => b.status === 'completed')
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
    isCached,
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
