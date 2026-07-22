import { supabase } from '../supabase';
import { getLocalDateString } from '../utils';
import type { Booking } from '../../types';

/** Cria um agendamento via RPC, criando o cliente automaticamente se necessário. */
export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'created_at' | 'status' | 'client_id'> & {
    coupon_id?: string;
    discount_amount?: number;
    barber_id?: string;
  },
  clientData: { name: string; phone: string; email?: string }
) => {
  if (!clientData.name.trim()) throw new Error('Informe seu nome.');
  if (clientData.phone.replace(/\D/g, '').length < 11) {
    throw new Error('Informe um telefone válido com DDD.');
  }
  if (bookingData.service_ids.length === 0) throw new Error('Selecione pelo menos um serviço.');
  if (!bookingData.booking_date) throw new Error('Selecione uma data.');
  if (!bookingData.booking_time) throw new Error('Selecione um horário.');
  if (bookingData.total_price <= 0) throw new Error('O preço total deve ser maior que zero.');

  const { data, error } = await supabase.rpc('criar_agendamento_rate_limited', {
    p_cliente_nome: clientData.name.trim(),
    p_cliente_telefone: clientData.phone.replace(/\D/g, ''),
    p_cliente_email: clientData.email || null,
    p_servicos: bookingData.service_ids,
    p_data: bookingData.booking_date,
    p_hora: bookingData.booking_time,
    p_preco_total: bookingData.total_price,
    p_duracao_total: bookingData.total_duration,
    p_coupon_id: bookingData.coupon_id || null,
    p_discount_amount: bookingData.discount_amount || 0,
    p_barber_id: bookingData.barber_id || null,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('preenchido') || msg.includes('unique_violation')) {
      throw new Error('Este horário acabou de ser preenchido. Por favor, escolha outro.');
    }
    if (msg.toLowerCase().includes('limite de 3 agendamentos')) {
      throw new Error('Limite de 3 agendamentos por dia atingido para este telefone.');
    }
    throw new Error(msg || 'Erro ao criar agendamento. Tente novamente.');
  }

  return Array.isArray(data) ? data : [data];
};

/** Busca horários disponíveis para uma data via RPC. */
export const getAvailableSlots = async (date: string) => {
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_date: date,
  });
  if (error) throw error;
  return (data || [])
    .map((item: { slot_time: string }) => (item?.slot_time ?? '').slice(0, 5))
    .filter(Boolean);
};

/** Busca agendamentos, opcionalmente filtrados por data e/ou barbeiro, com paginação. */
export const getBookings = async (
  date?: string,
  options?: { page?: number; pageSize?: number; barberId?: string }
) => {
  const { page = 1, pageSize = 200, barberId } = options || {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('bookings')
    .select(
      `
      *,
      clients (
        name,
        phone
      ),
      barbers (
        name,
        phone,
        photo_url
      )
    `,
      { count: 'exact' }
    )
    .order('booking_time', { ascending: true })
    .range(from, to);

  if (date) {
    query = query.eq('booking_date', date);
  }

  if (barberId) {
    query = query.eq('barber_id', barberId);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], total: count || 0, page, pageSize };
};

/** Atualiza o status de um agendamento. */
export const updateBookingStatus = async (
  id: string,
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending'
) => {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);

  if (error) throw error;
};

/** Cancela permanentemente um agendamento (status → cancelled, preserva dados históricos). */
export const deleteBooking = async (id: string) => {
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);

  if (error) throw error;
};

/** Busca agendamentos futuros pelo telefone do cliente (com rate limiting server-side). */
export const getBookingsByPhone = async (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const { data, error } = await supabase.rpc('get_bookings_by_phone_rate_limited', {
    p_phone: cleanPhone,
  });

  if (error) throw error;
  return data || [];
};

/** Busca o último agendamento do cliente (para sugestão de repetição). */
export const getLastBookingByPhone = async (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const { data, error } = await supabase.rpc('get_last_booking_by_phone_rate_limited', {
    p_phone: cleanPhone,
  });

  if (error || !data) return null;
  return data;
};

/** Cancela um agendamento (status → cancelled) via RPC seguro.
 *  Público: exige token de gerenciamento.
 *  Admin: pode cancelar sem token (autenticado via RLS). */
export const cancelBooking = async (id: string, token?: string) => {
  const params: Record<string, string> = { p_booking_id: id };
  if (token) params.p_token = token;
  const { data, error } = await supabase.rpc('cancel_booking_public', params);
  if (error) throw error;
  if (!data) throw new Error('Não foi possível cancelar o agendamento.');
};

/** Alterna o bloqueio de um horário específico via RPC. */
export const toggleSlotBlock = async (date: string, time: string) => {
  const { data, error } = await supabase.rpc('toggle_slot_block', {
    p_date: date,
    p_time: time,
  });
  if (error) throw error;
  return data;
};

/** Desbloqueia todos os horários de um dia via RPC. */
export const unblockDay = async (date: string) => {
  const { error } = await supabase.rpc('unblock_day', {
    p_date: date,
  });
  if (error) throw error;
};

/** Marca como concluídos os agendamentos cujo horário já passou (delega ao RPC server-side). */
export const autoCompleteExpiredBookings = async (): Promise<number> => {
  const { error } = await supabase.rpc('completar_agendamentos_expirados');
  if (error) return 0;
  // RPC não retorna count — retorna 0 para não causar loop infinito de refetch
  // O auto-complete acontece server-side; o dashboard atualiza no próximo refresh natural
  return 0;
};

/** Busca bookings para cálculo de estatísticas. Limita aos últimos 12 meses por padrão. */
export const getBookingsForStats = async (monthsBack: number = 12) => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);
  const cutoffStr = getLocalDateString(cutoff);

  const { data, error } = await supabase
    .from('bookings')
    .select('id, client_id, booking_date, booking_time, total_price, status')
    .gte('booking_date', cutoffStr)
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

/** Cancela todos os agendamentos (soft-delete: status → cancelled). Preserva dados históricos. */
export const deleteAllBookings = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .neq('status', 'cancelled')
    .select('id');
  if (error) throw error;
  return data?.length || 0;
};

// Booking Management (public)

export interface ManagedBooking {
  booking_id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
  total_duration: number;
  service_ids: string[];
  service_names: string[];
  client_name: string;
  client_phone: string;
  is_expired: boolean;
}

/** Busca agendamentos por token de gerenciamento (acesso público). */
export const getBookingsByToken = async (token: string): Promise<ManagedBooking[]> => {
  const { data, error } = await supabase.rpc('get_bookings_by_token', {
    p_token: token,
  });

  if (error) throw error;
  return (data || []) as ManagedBooking[];
};
