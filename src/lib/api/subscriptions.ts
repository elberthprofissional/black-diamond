import { supabase } from '../supabase';
import { logError } from '../logger';
import { getSetting, upsertSetting } from './settings';

export interface SubscriptionStatus {
  has_subscription: boolean;
  is_active: boolean;
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'none';
  current_period_start?: string;
  current_period_end?: string;
  grace_period_end?: string;
  days_remaining: number;
  is_blocked: boolean;
}

export interface PaymentInfo {
  id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'overdue' | 'refunded' | 'cancelled';
  payment_method?: string;
  paid_at?: string;
  due_date: string;
  created_at: string;
}

/**
 * Verifica o status da assinatura de um barbeiro.
 */
export async function checkSubscriptionStatus(barberId: string): Promise<SubscriptionStatus> {
  try {
    const { data, error } = await supabase.rpc('check_subscription_status', {
      p_barber_id: barberId,
    });

    if (error) throw error;
    return data as SubscriptionStatus;
  } catch (e) {
    logError(e, 'checkSubscriptionStatus');
    return {
      has_subscription: false,
      is_active: true,
      status: 'none',
      days_remaining: 999,
      is_blocked: false,
    };
  }
}

/**
 * Busca histórico de pagamentos de um barbeiro.
 */
export async function getPaymentHistory(barberId: string): Promise<PaymentInfo[]> {
  try {
    const { data, error } = await supabase.rpc('get_payment_history', {
      p_barber_id: barberId,
    });

    if (error) throw error;
    return (data || []) as PaymentInfo[];
  } catch (e) {
    logError(e, 'getPaymentHistory');
    return [];
  }
}

/**
 * Atualiza subscription como paga manualmente (admin).
 */
export async function markAsPaid(barberId: string): Promise<void> {
  const { error } = await supabase.rpc('update_subscription_paid', {
    p_barber_id: barberId,
  });

  if (error) throw error;
}

/**
 * Busca a chave PIX do dono (para exibir aos barbeiros).
 */
export async function getOwnerPixKey(): Promise<string | null> {
  try {
    return await getSetting('owner_pix_key');
  } catch (e) {
    logError(e, 'getOwnerPixKey');
    return null;
  }
}

/**
 * Salva/atualiza a chave PIX do dono.
 */
export async function saveOwnerPixKey(key: string): Promise<void> {
  await upsertSetting('owner_pix_key', key);
}
