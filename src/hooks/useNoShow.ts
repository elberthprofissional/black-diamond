import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { checkAndNotifyNoShowLimit } from '../lib/api/noShow';
import { useToast } from './useToast';
import { logError } from '../lib/logger';

interface UseNoShowOptions {
  onBookingUpdated?: () => void;
}

export function useNoShow(options?: UseNoShowOptions) {
  const { showSuccess, showError } = useToast();
  const [markingNoShow, setMarkingNoShow] = useState<string | null>(null);
  const onBookingUpdated = options?.onBookingUpdated;

  const markAsNoShow = useCallback(
    async (bookingId: string, clientName?: string, clientId?: string, clientPhone?: string) => {
      setMarkingNoShow(bookingId);
      try {
        const { error } = await supabase
          .from('bookings')
          .update({ no_show: true, status: 'cancelled' })
          .eq('id', bookingId);

        if (error) throw error;

          // Se temos dados do cliente, checa se atingiu o limite e cria notificação
        if (clientId && clientName) {
          const hitLimit = await checkAndNotifyNoShowLimit(clientId, clientName, clientPhone);
          if (hitLimit) {
            showSuccess(
              `${clientName} atingiu o limite de faltas. Notificação enviada — bora conversar com ele!`
            );
          } else {
            showSuccess('Falta registrada. Fique de olho se acumular mais.');
          }
        } else {
          showSuccess('Falta registrada.');
        }

        onBookingUpdated?.();
      } catch (e) {
        logError(e);
        showError('Erro ao marcar falta');
      } finally {
        setMarkingNoShow(null);
      }
    },
    [showSuccess, showError, onBookingUpdated]
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

        showSuccess('Falta removida');
        onBookingUpdated?.();
      } catch (e) {
        logError(e);
        showError('Erro ao remover falta');
      } finally {
        setMarkingNoShow(null);
      }
    },
    [showSuccess, showError, onBookingUpdated]
  );

  return {
    markAsNoShow,
    undoNoShow,
    markingNoShow,
  };
}
