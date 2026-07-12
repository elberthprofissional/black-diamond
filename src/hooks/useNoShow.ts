import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useAuditLog } from './useAuditLog';

interface UseNoShowOptions {
  onBookingUpdated?: () => void;
}

export function useNoShow(options?: UseNoShowOptions) {
  const { showSuccess, showError } = useToast();
  const { log } = useAuditLog();
  const [markingNoShow, setMarkingNoShow] = useState<string | null>(null);
  const onBookingUpdated = options?.onBookingUpdated;

  const markAsNoShow = useCallback(
    async (bookingId: string) => {
      setMarkingNoShow(bookingId);
      try {
        const { error } = await supabase
          .from('bookings')
          .update({ no_show: true, status: 'cancelled' })
          .eq('id', bookingId);

        if (error) throw error;

        log({
          action: 'booking_no_show',
          target_id: bookingId,
          details: { marked_as_no_show: true },
        });

        showSuccess('Cliente marcado como não compareceu');
        onBookingUpdated?.();
      } catch {
        showError('Erro ao marcar falta');
      } finally {
        setMarkingNoShow(null);
      }
    },
    [log, showSuccess, showError, onBookingUpdated]
  );

  const undoNoShow = useCallback(
    async (bookingId: string) => {
      setMarkingNoShow(bookingId);
      try {
        const { error } = await supabase
          .from('bookings')
          .update({ no_show: false, status: 'confirmed' })
          .eq('id', bookingId);

        if (error) throw error;

        log({
          action: 'booking_no_show_undone',
          target_id: bookingId,
          details: { marked_as_no_show: false },
        });

        showSuccess('Falta removida');
        onBookingUpdated?.();
      } catch {
        showError('Erro ao remover falta');
      } finally {
        setMarkingNoShow(null);
      }
    },
    [log, showSuccess, showError, onBookingUpdated]
  );

  const getClientNoShowCount = useCallback(
    async (clientId: string, days: number = 90): Promise<number> => {
      try {
        const { count, error } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('no_show', true)
          .gte(
            'booking_date',
            new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          );

        if (error) throw error;
        return count || 0;
      } catch {
        return 0;
      }
    },
    []
  );

  const isClientBlocked = useCallback(
    async (clientId: string, maxNoShows: number = 3): Promise<boolean> => {
      const count = await getClientNoShowCount(clientId);
      return count >= maxNoShows;
    },
    [getClientNoShowCount]
  );

  return {
    markAsNoShow,
    undoNoShow,
    getClientNoShowCount,
    isClientBlocked,
    markingNoShow,
  };
}
