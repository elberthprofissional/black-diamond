import { useState, useCallback, useRef } from 'react';
import { createBooking } from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useBarberSettings } from './useBarberSettings';
import type { Service } from '../types';

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
  const { barberPhone } = useBarberSettings();
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

        // Create in-app notification for all admins
        try {
          const serviceNames = selectedServices.map((s) => s.name).join(', ');
          const formattedDate = selectedDate.split('-').reverse().join('/');
          const mensalistaTag = isMensalista ? ' [MENSALISTA]' : '';
          const clientPhoneClean = userInfo.phone.replace(/\D/g, '');
          const totalFormatted = `R$ ${totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          const notifBody = `${userInfo.name.trim()}${mensalistaTag} | ${serviceNames} | ${formattedDate} às ${selectedTime} | ${totalFormatted} | ${clientPhoneClean} | ${manageUrl}`;

          // Get all admin user_ids
          const { data: admins } = await supabase.from('admin_users').select('user_id');

          if (admins && admins.length > 0) {
            const notifications = admins.map((admin: { user_id: string }) => ({
              user_id: admin.user_id,
              title: 'Novo Agendamento! 💈',
              body: notifBody,
              tag: `booking-${result?.id || Date.now()}`,
              url: '/admin',
            }));
            await supabase.from('notifications').insert(notifications);
          }
        } catch {
          // Notification is best-effort
        }

        // Open WhatsApp for the barber with new booking notification
        try {
          if (barberPhone) {
            const waDate = selectedDate.split('-').reverse().join('/');
            const waTime = selectedTime.slice(0, 5);
            const serviceLines = selectedServices.map((s) => `* ${s.name}`).join('\n');
            const totalFormatted = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;

            const message = [
              'BLACK DIAMOND BARBEARIA',
              'NOVO AGENDAMENTO',
              '\u2501'.repeat(28),
              '',
              `Cliente: ${userInfo.name.trim()}`,
              `Tel: ${userInfo.phone.replace(/\D/g, '')}`,
              '',
              'Servi\u00e7os:',
              serviceLines,
              '',
              `Data: ${waDate}`,
              `Hor\u00e1rio: ${waTime}`,
              '',
              `Valor Total: ${totalFormatted}`,
              '',
              manageUrl ? `🔗 Gerenciar: ${manageUrl}` : '',
            ].join('\n');

            window.open(
              `https://wa.me/${barberPhone}?text=${encodeURIComponent(message)}`,
              '_blank'
            );
          }
        } catch {
          // WhatsApp opening is best-effort
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
