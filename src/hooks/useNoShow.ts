import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { checkAndNotifyNoShowLimit } from '../lib/api/noShow';
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
    async (bookingId: string, clientName?: string, clientId?: string) => {
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

        // Se temos dados do cliente, checa se atingiu o limite e cria notificação
        if (clientId && clientName) {
          const hitLimit = await checkAndNotifyNoShowLimit(clientId, clientName);
          if (hitLimit) {
            showSuccess(
              'Cliente marcado como falta. Alerta enviado para o painel de notificações.'
            );
          } else {
            showSuccess('Cliente marcado como não compareceu');
          }
        } else {
          showSuccess('Cliente marcado como não compareceu');
        }

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

  return {
    markAsNoShow,
    undoNoShow,
    markingNoShow,
  };
}
