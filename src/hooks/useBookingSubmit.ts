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
  isMensalista: boolean;
}

interface BookingResult {
  token: string;
  manageUrl: string;
}

export function useBookingSubmit(showError: (msg: string) => void, onComplete: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleConfirm = useCallback(
    async (params: SubmitParams): Promise<BookingResult | null> => {
      const { selectedServices, selectedDate, selectedTime, userInfo, totalPrice, isMensalista } =
        params;

      if (
        submittingRef.current ||
        isSubmitting ||
        !selectedTime ||
        !userInfo.name ||
        !userInfo.phone ||
        selectedServices.length === 0
      ) {
        return null;
      }

      if (!navigator.onLine) {
        showError(
          'Você está sem conexão com a internet. Por favor, verifique sua rede e tente novamente.'
        );
        return null;
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

        const result = Array.isArray(bookingResult) ? bookingResult[0] : bookingResult;
        const token = result?.token || '';
        const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
        const manageUrl = token ? `${siteUrl}/gerenciar?token=${token}` : '';

        // Save booking to localStorage
        try {
          const notificationsAllowed =
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted';

          const bookingData: ClientBookingData = {
            id: result?.id || '',
            token: token,
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
          // localStorage unavailable
        }

        // Send push notification to barber with booking details
        try {
          const serviceNames = selectedServices.map((s) => s.name).join(', ');
          const formattedDate = selectedDate.split('-').reverse().join('/');
          const mensalistaTag = isMensalista ? ' [MENSALISTA]' : '';
          const pushBody = `${userInfo.name.trim()}${mensalistaTag} - ${serviceNames} - ${formattedDate} às ${selectedTime}`;
          supabase.functions
            .invoke('send-push', {
              body: {
                title: 'Novo Agendamento! 💈',
                body: pushBody,
                tag: `booking-${result?.id || Date.now()}`,
                url: '/admin',
              },
            })
            .catch(() => {});
        } catch {
          // Push notification is nice-to-have; silently ignore failures
        }

        onComplete();
        return { token, manageUrl };
      } catch (error) {
        showError(getErrorMessage(error));
        return null;
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [isSubmitting, showError, onComplete]
  );

  return { isSubmitting, handleConfirm };
}
