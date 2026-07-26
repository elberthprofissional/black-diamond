import { useState, useEffect, useCallback } from 'react';
import { checkSubscriptionStatus, getPaymentHistory, createAsaasPayment, type SubscriptionStatus, type PaymentInfo, type PaymentResult } from '../lib/api/subscriptions';
import { logError } from '../lib/logger';

interface UseSubscriptionReturn {
  status: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  payments: PaymentInfo[];
  generatingPayment: boolean;
  paymentResult: PaymentResult | null;
  paymentError: string | null;
  refresh: () => Promise<void>;
  generatePayment: () => Promise<void>;
}

export function useSubscription(barberId: string | undefined): UseSubscriptionReturn {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!barberId) return;

    setLoading(true);
    setError(null);

    try {
      const [subStatus, history] = await Promise.all([
        checkSubscriptionStatus(barberId),
        getPaymentHistory(barberId),
      ]);

      setStatus(subStatus);
      setPayments(history);
    } catch (e) {
      logError(e, 'useSubscription');
      setError('Erro ao verificar assinatura');
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  const generatePayment = useCallback(async () => {
    if (!barberId) return;

    setGeneratingPayment(true);
    setPaymentError(null);
    setPaymentResult(null);

    try {
      const result = await createAsaasPayment(barberId);
      setPaymentResult(result);
      // Atualiza status depois de gerar
      await refresh();
    } catch (e) {
      logError(e, 'useSubscription/generatePayment');
      setPaymentError(e instanceof Error ? e.message : 'Erro ao gerar pagamento');
    } finally {
      setGeneratingPayment(false);
    }
  }, [barberId, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    status,
    loading,
    error,
    payments,
    generatingPayment,
    paymentResult,
    paymentError,
    refresh,
    generatePayment,
  };
}
