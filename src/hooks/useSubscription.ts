import { useState, useEffect, useCallback } from 'react';
import {
  checkSubscriptionStatus,
  getPaymentHistory,
  type SubscriptionStatus,
  type PaymentInfo,
} from '../lib/api/subscriptions';
import { logError } from '../lib/logger';

interface UseSubscriptionReturn {
  status: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  payments: PaymentInfo[];
  refresh: () => Promise<void>;
}

export function useSubscription(barberId: string | undefined): UseSubscriptionReturn {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return {
    status,
    loading,
    error,
    payments,
    refresh,
  };
}
