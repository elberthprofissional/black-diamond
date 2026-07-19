import { useState, useCallback, useRef } from 'react';
import { createBooking } from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import { openWhatsApp, formatWaDate, formatWaTime, formatWaCurrency } from '../lib/whatsapp';
import { useBarberSettings } from './useBarberSettings';
import { useRateLimit } from './useRateLimit';
import type { Service } from '../types';
import { logError } from '../lib/logger';

interface SubmitParams {
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  userInfo: { name: string; phone: string };
  totalPrice: number;
  isMensalista: boolean;
  couponId?: string;
  discountAmount?: number;
}

interface BookingResult {
  token: string;
  manageUrl: string;
}

export function useBookingSubmit(
  showError: (msg: string) => void,
  onComplete: () => void,
  showSuccess?: (msg: string) => void
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const { barberPhone } = useBarberSettings();
  const { isBlocked, recordAttempt, getTimeUntilReset } = useRateLimit('booking_submit', {
    maxAttempts: 3,
    windowMs: 60000,
  });

  const handleConfirm = useCallback(
    async (params: SubmitParams): Promise<BookingResult | null> => {
      const {
        selectedServices,
        selectedDate,
        selectedTime,
        userInfo,
        totalPrice,
        couponId,
        discountAmount,
      } = params;

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

      if (isBlocked) {
        const seconds = Math.ceil(getTimeUntilReset() / 1000);
        showError(
          `Muitas tentativas. Aguarde ${seconds > 60 ? '1 minuto' : `${seconds} segundos`} e tente novamente.`
        );
        return null;
      }

      submittingRef.current = true;
      setIsSubmitting(true);
      recordAttempt();
      try {
        const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
        const bookingResult = await createBooking(
          {
            service_ids: selectedServices.map((s) => s.id),
            booking_date: selectedDate,
            booking_time: selectedTime,
            total_price: totalPrice,
            total_duration: totalDuration,
            coupon_id: couponId,
            discount_amount: discountAmount,
          },
          { name: userInfo.name, phone: userInfo.phone }
        );

        const result = Array.isArray(bookingResult) ? bookingResult[0] : bookingResult;
        const token = result?.token || '';
        const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
        const manageUrl = token ? `${siteUrl}/gerenciar?token=${token}` : '';

        // Open WhatsApp for the barber with new booking notification
        try {
          if (barberPhone) {
            const serviceLines = selectedServices.map((s) => `* ${s.name}`).join('\n');

            const message = [
              'BLACK DIAMOND BARBEARIA',
              'NOVO AGENDAMENTO',
              '\u2501'.repeat(28),
              '',
              `Cliente: ${userInfo.name.trim()}`,
              `Tel: ${userInfo.phone.replace(/\D/g, '')}`,
              '',
              'Serviços:',
              serviceLines,
              '',
              `Data: ${formatWaDate(selectedDate)}`,
              `Horário: ${formatWaTime(selectedTime)}`,
              '',
              `Valor Total: ${formatWaCurrency(totalPrice)}`,
              '',
              manageUrl
                ? `Caso precise cancelar ou reagendar seu horário, acesse: ${manageUrl}`
                : '',
            ].join('\n');

            openWhatsApp(barberPhone, message);
          }
        } catch (e) {
          logError(e);
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
    [isSubmitting, showError, onComplete, barberPhone, isBlocked, recordAttempt, getTimeUntilReset]
  );

  return { isSubmitting, handleConfirm };
}
