import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { checkAndNotifyNoShowLimit } from '../lib/api/noShow';
import { useToast } from './useToast';
import { useAuditLog } from './useAuditLog';

interface UseNoShowOptions {
  onBookingUpdated?: () => void;
}

interface MarkNoShowParams {
  bookingId: string;
  clientName?: string;
  clientId?: string;
  clientPhone?: string;
}

interface UndoNoShowParams {
  bookingId: string;
}

export function useNoShow(options?: UseNoShowOptions) {
  const { showSuccess, showError } = useToast();
  const { log: auditLog } = useAuditLog();
  const [markingNoShow, setMarkingNoShow] = useState<string | null>(null);
  const onBookingUpdated = options?.onBookingUpdated;

  const markMutation = useMutation({
    mutationFn: async ({ bookingId, clientId, clientName, clientPhone }: MarkNoShowParams) => {
      const { error } = await supabase
        .from('bookings')
        .update({ no_show: true, status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      await auditLog({
        action: 'booking_no_show',
        target_id: bookingId,
        details: { marked_as_no_show: true },
      });

      if (clientId && clientName) {
        return checkAndNotifyNoShowLimit(clientId, clientName, clientPhone);
      }
      return false;
    },
    onSuccess: (hitLimit, { clientName }) => {
      if (hitLimit && clientName) {
        showSuccess(
          `${clientName} atingiu o limite de faltas. Notificação enviada — bora conversar com ele!`
        );
      } else if (clientName) {
        showSuccess('Falta registrada. Fique de olho se acumular mais.');
      } else {
        showSuccess('Falta registrada.');
      }
      onBookingUpdated?.();
    },
    onError: () => {
      showError('Erro ao marcar falta');
    },
    onSettled: () => {
      setMarkingNoShow(null);
    },
  });

  const undoMutation = useMutation({
    mutationFn: async ({ bookingId }: UndoNoShowParams) => {
      const { error } = await supabase
        .from('bookings')
        .update({ no_show: false, status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;

      await auditLog({
        action: 'booking_no_show_undone',
        target_id: bookingId,
        details: { marked_as_no_show: false },
      });
    },
    onSuccess: () => {
      showSuccess('Falta removida');
      onBookingUpdated?.();
    },
    onError: () => {
      showError('Erro ao remover falta');
    },
    onSettled: () => {
      setMarkingNoShow(null);
    },
  });

  const markAsNoShow = useCallback(
    (bookingId: string, clientName?: string, clientId?: string, clientPhone?: string) => {
      setMarkingNoShow(bookingId);
      markMutation.mutate({ bookingId, clientName, clientId, clientPhone });
    },
    [markMutation]
  );

  const undoNoShow = useCallback(
    (bookingId: string) => {
      setMarkingNoShow(bookingId);
      undoMutation.mutate({ bookingId });
    },
    [undoMutation]
  );

  return {
    markAsNoShow,
    undoNoShow,
    markingNoShow,
    // Expondo isPending para consumidores que queiram saber estado de carregamento
    isPending: markMutation.isPending || undoMutation.isPending,
  };
}
