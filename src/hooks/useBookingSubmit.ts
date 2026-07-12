import { useState, useCallback, useRef, useEffect } from 'react';
import { createBooking } from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import { useBarberSettings } from './useBarberSettings';
import { useRateLimit } from './useRateLimit';
import type { Service } from '../types';

const QUEUE_KEY = 'booking_offline_queue';

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

interface QueuedBooking {
  id: string;
  params: SubmitParams;
  createdAt: string;
}

interface BookingResult {
  token: string;
  manageUrl: string;
  queued?: boolean;
}

// Salva booking na fila offline
function saveToQueue(params: SubmitParams): void {
  try {
    const queue: QueuedBooking[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      params,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage cheio ou indisponível
  }
}

// Remove da fila após enviar com sucesso
function removeFromQueue(id: string): void {
  try {
    const queue: QueuedBooking[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter((b) => b.id !== id)));
  } catch {
    // Ignora
  }
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

  // Processa fila offline quando voltar a internet
  useEffect(() => {
    let mounted = true;
    const processQueue = async () => {
      try {
        const queue: QueuedBooking[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        if (queue.length === 0) return;

        for (const item of queue) {
          try {
            const {
              selectedServices,
              selectedDate,
              selectedTime,
              userInfo,
              totalPrice,
              couponId,
              discountAmount,
            } = item.params;
            const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

            await createBooking(
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

            removeFromQueue(item.id);

            if (showSuccess) {
              const serviceNames = selectedServices.map((s) => s.name).join(', ');
              const formattedDate = selectedDate.split('-').reverse().join('/');
              showSuccess(
                `✅ Agendamento enviado! ${userInfo.name} - ${serviceNames} em ${formattedDate} às ${selectedTime}`
              );
            }
          } catch {
            // Slot já foi pego por outra pessoa — remove da fila e avisa
            removeFromQueue(item.id);
            const { selectedServices, selectedDate, selectedTime, userInfo } = item.params;
            const serviceNames = selectedServices.map((s) => s.name).join(', ');
            const formattedDate = selectedDate.split('-').reverse().join('/');
            showError(
              `😕 ${userInfo.name}, o horário das ${selectedTime} do dia ${formattedDate} (${serviceNames}) infelizmente já foi preenchido por outra pessoa. Por favor, faça um novo agendamento.`
            );
          }
        }
      } catch {
        // Erro ao processar fila
      }
    };

    const handleOnline = () => {
      if (!mounted) return;
      // Pequeno delay pra garantir que a conexão está estável
      setTimeout(processQueue, 2000);
    };

    window.addEventListener('online', handleOnline);

    // Tenta processar fila no mount (caso já esteja online)
    if (navigator.onLine) {
      processQueue();
    }

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
    };
  }, [showSuccess, showError]);

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

      // Se estiver offline, salva na fila e retorna sucesso
      if (!navigator.onLine) {
        saveToQueue(params);
        onComplete();
        return { token: '', manageUrl: '', queued: true };
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
              'Serviços:',
              serviceLines,
              '',
              `Data: ${waDate}`,
              `Horário: ${waTime}`,
              '',
              `Valor Total: ${totalFormatted}`,
              '',
              manageUrl
                ? `Caso precise cancelar ou reagendar seu horário, acesse: ${manageUrl}`
                : '',
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
    [isSubmitting, showError, onComplete, barberPhone, isBlocked, recordAttempt, getTimeUntilReset]
  );

  return { isSubmitting, handleConfirm };
}
