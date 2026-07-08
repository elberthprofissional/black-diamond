import { useState, useCallback, useRef } from 'react';
import { createBooking } from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import { supabase } from '../lib/supabase';
import type { Service } from '../types';
import type { ClientBookingData } from './useClientBooking';

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
  const submittingRef = useRef(false);

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
        submittingRef.current ||
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

      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
        const bookingResult = await createBooking(
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

        // Save booking to localStorage for the client card on Home
        try {
          const result = Array.isArray(bookingResult) ? bookingResult[0] : bookingResult;
          const notificationsAllowed =
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted';

          const bookingData: ClientBookingData = {
            id: result?.id || '',
            clientName: userInfo.name.trim(),
            clientPhone: userInfo.phone.replace(/\D/g, ''),
            serviceName: selectedServices.map((s) => s.name).join(', '),
            date: selectedDate,
            time: selectedTime,
            totalPrice,
            notificationEnabled: notificationsAllowed,
            notificationSent: false,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem('client_booking', JSON.stringify(bookingData));
        } catch {
          // localStorage unavailable — card simply won't appear
        }

        // Send push notification to barber (fire-and-forget)
        try {
          const serviceNames = selectedServices.map((s) => s.name).join(', ');
          const formattedDate = selectedDate.split('-').reverse().join('/');
          supabase.functions
            .invoke('send-push', {
              body: {
                title: 'Novo Agendamento! 💈',
                body: `${userInfo.name.trim()} - ${serviceNames} - ${formattedDate} às ${selectedTime}`,
                tag: `booking-${Date.now()}`,
              },
            })
            .catch(() => {});
        } catch {
          // Push notification is nice-to-have; silently ignore failures
        }

        onComplete();
      } catch (error) {
        showError(getErrorMessage(error));
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [isSubmitting, showError, onComplete]
  );

  return { isSubmitting, handleConfirm };
}
