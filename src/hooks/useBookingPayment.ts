import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createBooking, validateCoupon, applyCoupon } from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import { openWhatsApp, formatWaDate, formatWaTime, formatWaCurrency } from '../lib/whatsapp';
import { useBarberSettings } from './useBarberSettings';
import { useRateLimit } from './useRateLimit';
import type { Service } from '../types';
import { logError } from '../lib/logger';

interface CouponState {
  coupon_id: string;
  code: string;
  discount_type: string;
  discount_amount: number;
}

interface PaymentParams {
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  userInfo: { name: string; phone: string };
  totalPrice: number;
  isMensalista: boolean;
  couponId?: string;
  discountAmount?: number;
  barberId?: string;
  barberPhone?: string;
}

interface BookingResult {
  token: string;
  manageUrl: string;
  queued?: boolean;
}

export function useBookingPayment(
  selectedServices: Service[],
  showError: (msg: string) => void,
  onComplete: () => void
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const { barberPhone } = useBarberSettings();
  const { isBlocked, recordAttempt, getTimeUntilReset } = useRateLimit('booking_submit', {
    maxAttempts: 3,
    windowMs: 60000,
  });

  // Coupon state
  const [coupon, setCoupon] = useState<CouponState | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponCode, setCouponCode] = useState('');

  // Coupon validation
  const handleCouponValidate = useCallback(
    async (code: string) => {
      if (!code.trim()) {
        setCouponError('Informe um código.');
        return;
      }
      setCouponLoading(true);
      setCouponError('');
      try {
        const result = await validateCoupon(
          code,
          selectedServices.map((s) => s.id)
        );
        if (result.valid) {
          setCouponCode(code.trim().toUpperCase());
          setCoupon({
            coupon_id: result.coupon_id || '',
            code: result.code || '',
            discount_type: result.discount_type || '',
            discount_amount: result.discount_amount || 0,
          });
        } else {
          setCoupon(null);
          setCouponCode('');
          setCouponError(result.error || 'Cupom inválido.');
        }
      } catch (e) {
        logError(e);
        setCoupon(null);
        setCouponCode('');
        setCouponError('Erro ao validar cupom.');
      } finally {
        setCouponLoading(false);
      }
    },
    [selectedServices]
  );

  const handleCouponRemove = useCallback(() => {
    setCoupon(null);
    setCouponError('');
    setCouponCode('');
  }, []);

  // Re-validate coupon when services change
  useEffect(() => {
    if (!couponCode || selectedServices.length === 0) return;
    let cancelled = false;
    setCouponLoading(true);

    validateCoupon(
      couponCode,
      selectedServices.map((s) => s.id)
    )
      .then((result) => {
        if (cancelled) return;
        if (result.valid) {
          setCoupon({
            coupon_id: result.coupon_id || '',
            code: result.code || '',
            discount_type: result.discount_type || '',
            discount_amount: result.discount_amount || 0,
          });
        } else {
          setCoupon(null);
          setCouponCode('');
          setCouponError(result.error || 'Cupom inválido para os serviços selecionados.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoupon(null);
          setCouponCode('');
        }
      })
      .finally(() => {
        if (!cancelled) setCouponLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [couponCode, selectedServices]);

  // Calculate prices
  const calculatedTotalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price), 0),
    [selectedServices]
  );
  const finalPrice = useMemo(
    () => Math.max(0, calculatedTotalPrice - (coupon?.discount_amount || 0)),
    [calculatedTotalPrice, coupon?.discount_amount]
  );

  // Submission
  const handleConfirm = useCallback(
    async (params: PaymentParams): Promise<BookingResult | null> => {
      const {
        selectedServices: services,
        selectedDate,
        selectedTime,
        userInfo,
        totalPrice,
        couponId,
        discountAmount,
        barberId,
        barberPhone: barberPhoneParam,
      } = params;

      if (
        submittingRef.current ||
        isSubmitting ||
        !selectedTime ||
        !userInfo.name ||
        !userInfo.phone ||
        services.length === 0
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
        const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
        const bookingResult = await createBooking(
          {
            service_ids: services.map((s) => s.id),
            booking_date: selectedDate,
            booking_time: selectedTime,
            total_price: totalPrice,
            total_duration: totalDuration,
            coupon_id: couponId,
            discount_amount: discountAmount,
            barber_id: barberId,
          },
          { name: userInfo.name, phone: userInfo.phone }
        );

        const result = Array.isArray(bookingResult) ? bookingResult[0] : bookingResult;
        const token = result?.token || '';
        const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
        const manageUrl = token ? `${siteUrl}/gerenciar?token=${token}` : '';

        // WhatsApp notification
        try {
          const targetPhone = barberPhoneParam || barberPhone;
          if (targetPhone) {
            const serviceLines = services.map((s) => `* ${s.name}`).join('\n');
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

            openWhatsApp(targetPhone, message);
          }
        } catch (e) {
          logError(e);
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

  return {
    // Coupon
    coupon,
    couponLoading,
    couponError,
    handleCouponValidate,
    handleCouponRemove,
    // Prices
    calculatedTotalPrice,
    finalPrice,
    // Submission
    isSubmitting,
    handleConfirm,
  };
}
