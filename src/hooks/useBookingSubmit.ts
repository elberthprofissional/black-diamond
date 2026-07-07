import { useState, useCallback } from 'react';
import { createBooking } from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import type { Service } from '../types';

interface SubmitParams {
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  userInfo: { name: string; phone: string };
  totalPrice: number;
  barberPhone: string;
  isMensalista: boolean;
}

export function useBookingSubmit(showError: (msg: string) => void, onComplete: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = useCallback(
    async (params: SubmitParams) => {
      const {
        selectedServices,
        selectedDate,
        selectedTime,
        userInfo,
        totalPrice,
        barberPhone,
        isMensalista,
      } = params;

      if (
        isSubmitting ||
        !selectedTime ||
        !userInfo.name ||
        !userInfo.phone ||
        selectedServices.length === 0
      ) {
        return;
      }

      if (!navigator.onLine) {
        showError(
          'Você está sem conexão com a internet. Por favor, verifique sua rede e tente novamente.'
        );
        return;
      }

      setIsSubmitting(true);
      try {
        const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
        await createBooking(
          {
            service_ids: selectedServices.map((s) => s.id),
            booking_date: selectedDate,
            booking_time: selectedTime,
            total_price: totalPrice,
            total_duration: totalDuration,
          },
          { name: userInfo.name, phone: userInfo.phone }
        );

        if (barberPhone) {
          const serviceNames = selectedServices.map((s) => s.name).join(', ');
          const formattedDate = selectedDate.split('-').reverse().join('/');
          const mensalistaTag = isMensalista ? ' [MENSALISTA]' : '';
          const msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━\nBLACK DIAMOND BARBEARIA\nNOVO AGENDAMENTO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nCliente:\n${userInfo.name.trim()}${mensalistaTag}\n\nServiços:\n${serviceNames
            .split(', ')
            .map((s) => `• ${s}`)
            .join(
              '\n'
            )}\n\nData:\n${formattedDate}\n\nHorário:\n${selectedTime}\n\nValor Total:\nR$ ${totalPrice.toFixed(2).replace('.', ',')}`;
          const waUrl = `https://wa.me/${barberPhone}?text=${encodeURIComponent(msg)}`;
          window.open(waUrl, '_blank');
        }

        onComplete();
      } catch (error) {
        showError(getErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, showError, onComplete]
  );

  return { isSubmitting, handleConfirm };
}
