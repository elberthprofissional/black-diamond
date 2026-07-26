// =========================================================================
// Asaas Webhook - Edge Function
// =========================================================================
// Recebe webhooks do Asaas quando um pagamento é confirmado,
// atualiza a subscription e o payment_log no banco.
//
// POST /asaas-webhook
// Body: Asaas webhook payload (event + payment)
// =========================================================================

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface AsaasWebhookEvent {
  event: string;
  payment: {
    id: string;
    status: string;
    value: number;
    billingType: string;
    externalReference: string;
    confirmedDate: string;
    paymentDate: string;
    customer: string;
  };
}

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const event: AsaasWebhookEvent = await req.json();
    console.warn('Webhook received:', event.event, event.payment?.id);

    const { event: eventType, payment } = event;

    if (!payment || !payment.externalReference) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload' }),
        { status: 400, headers }
      );
    }

    const barberId = payment.externalReference;

    switch (eventType) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        // Pagamento confirmado → ativa subscription
        const { error } = await supabase.rpc('update_subscription_paid', {
          p_barber_id: barberId,
          p_asaas_payment_id: payment.id,
          p_payment_method: payment.billingType === 'PIX' ? 'pix' : 'credit_card',
        });

        if (error) {
          console.error('Error updating subscription:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update subscription' }),
            { status: 500, headers }
          );
        }

        console.warn(`Subscription activated for barber ${barberId}`);
        break;
      }

      case 'PAYMENT_OVERDUE': {
        // Pagamento vencido → marca como expirado
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('barber_id', barberId)
          .eq('status', 'pending');

        if (error) {
          console.error('Error marking subscription overdue:', error);
        }
        break;
      }

      case 'PAYMENT_CANCELLED':
      case 'PAYMENT_REFUNDED': {
        // Pagamento cancelado/estornado
        const { error } = await supabase
          .from('payment_logs')
          .update({
            status: eventType === 'PAYMENT_REFUNDED' ? 'refunded' : 'cancelled',
          })
          .eq('asaas_payment_id', payment.id);

        if (error) {
          console.error('Error updating payment log:', error);
        }
        break;
      }

      default:
        console.warn(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ success: true, event: eventType }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
});
