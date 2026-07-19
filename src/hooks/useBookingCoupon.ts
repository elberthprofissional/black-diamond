import { useState, useCallback, useEffect } from 'react';
import { validateCoupon } from '../lib/api';
import type { Service } from '../types';
import { logError } from '../lib/logger';

interface CouponState {
  coupon_id: string;
  code: string;
  discount_type: string;
  discount_amount: number;
}

export function useBookingCoupon(selectedServices: Service[]) {
  const [coupon, setCoupon] = useState<CouponState | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponCode, setCouponCode] = useState('');

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

  return {
    coupon,
    couponLoading,
    couponError,
    handleCouponValidate,
    handleCouponRemove,
  };
}
