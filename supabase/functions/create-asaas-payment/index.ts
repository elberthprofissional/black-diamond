// =========================================================================
// Create Asaas Payment - Edge Function
// =========================================================================
// Cria uma cobrança no Asaas (PIX/boleto/cartão) e retorna
// o link de pagamento e o QR Code PIX.
//
// Chamado pelo admin quando quer gerar um link de pagamento
// para um barbeiro.
//
// POST /create-asaas-payment
// Body: { barber_id: string, barber_name?: string, barber_email?: string, barber_cpf?: string }
// =========================================================================

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_ENV = Deno.env.get('ASAAS_ENVIRONMENT') || 'sandbox';
const ASAAS_BASE_URL =
  ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface CreatePaymentRequest {
  barber_id: string;
  barber_name?: string;
  barber_email?: string;
  barber_cpf?: string;
  barber_phone?: string;
}

interface AsaasCustomer {
  id: string;
}

interface AsaasPayment {
  id: string;
  status: string;
  invoiceUrl: string;
  pixQrCode?: {
    payload: string;
    encodedImage: string;
    expirationDate: string;
  };
}

async function fetchAsaas<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${ASAAS_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Asaas API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function findOrCreateCustomer(
  barberId: string,
  name: string,
  email?: string,
  cpf?: string,
  phone?: string
): Promise<string> {
  // Tenta buscar customer existente na subscription
  const subResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/check_subscription_status`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ p_barber_id: barberId }),
    }
  );

  if (subResponse.ok) {
    // Poderia verificar se já existe um asaas_customer_id na subscription
    // Mas como não temos a subscription completa aqui, criamos um novo customer
    // ou buscamos por CPF abaixo
  }

  // Busca customer pelo nome (CPF é melhor, mas opcional)
  if (cpf) {
    try {
      const customers = await fetchAsaas<{ data: AsaasCustomer[] }>(
        `/customers?cpfCnpj=${cpf}`
      );
      if (customers.data.length > 0) {
        return customers.data[0].id;
      }
    } catch {
      // Não encontrou, criar novo
    }
  }

  // Cria novo customer no Asaas
  const customer = await fetchAsaas<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: name || `Barbeiro ${barberId.slice(0, 8)}`,
      email: email || '',
      cpfCnpj: cpf || '',
      phone: phone || '',
      notificationDisabled: false,
      externalReference: barberId,
    }),
  });

  return customer.id;
}

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const body: CreatePaymentRequest = await req.json();
    const { barber_id, barber_name, barber_email, barber_cpf, barber_phone } = body;

    if (!barber_id) {
      return new Response(
        JSON.stringify({ error: 'barber_id is required' }),
        { status: 400, headers }
      );
    }

    // 1. Find or create customer in Asaas
    const customerId = await findOrCreateCustomer(
      barber_id,
      barber_name || 'Barbeiro',
      barber_email,
      barber_cpf,
      barber_phone
    );

    // 2. Calculate due date (today + 3 days for PIX, + 7 for boleto)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // 3. Create payment in Asaas
    const payment = await fetchAsaas<AsaasPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: 50.0,
        dueDate: dueDateStr,
        description: 'Black Diamond - Assinatura Mensal',
        externalReference: barber_id,
        postalService: false,
      }),
    });

    // 4. Get PIX QR Code
    let pixQrCode = null;
    try {
      pixQrCode = await fetchAsaas<{
        payload: string;
        encodedImage: string;
        expirationDate: string;
      }>(`/payments/${payment.id}/pixQrCode`);
    } catch {
      // PIX pode não estar disponível ainda
    }

    // 5. Retorna PIX info para o frontend
    // O webhook do Asaas (asaas-webhook) vai chamar update_subscription_paid
    // quando o pagamento for confirmado, criando a subscription e payment_log
    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        payment_link: payment.invoiceUrl,
        pix_qrcode: pixQrCode,
        status: payment.status,
        due_date: dueDateStr,
        value: 50.0,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers }
    );
  }
});
