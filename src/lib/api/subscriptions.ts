import { supabase } from '../supabase';
import { logError } from '../logger';

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

export interface PaymentResult {
  success: boolean;
  payment_id: string;
  payment_link: string;
  pix_qrcode: {
    payload: string;
    encodedImage: string;
    expirationDate: string;
  } | null;
  status: string;
  due_date: string;
  value: number;
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
 * Cria uma cobrança no Asaas e retorna PIX/link de pagamento.
 * Chama a Supabase Edge Function.
 */
export async function createAsaasPayment(barberId: string): Promise<PaymentResult> {
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-asaas-payment`;

  const { data: barber } = await supabase
    .from('barbers')
    .select('name, phone')
    .eq('id', barberId)
    .single();

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      barber_id: barberId,
      barber_name: barber?.name || undefined,
      barber_phone: barber?.phone || undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erro ao criar pagamento' }));
    throw new Error(errorData.error || 'Erro ao criar pagamento no Asaas');
  }

  return response.json();
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
