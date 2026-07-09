import { supabase } from '../supabase';
import type { Booking } from '../../types';

/** Cria um agendamento via RPC, criando o cliente automaticamente se necessário. */
export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'created_at' | 'status' | 'client_id'>,
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

  const { data, error } = await supabase.rpc('criar_agendamento', {
    p_cliente_nome: clientData.name.trim(),
    p_cliente_telefone: clientData.phone.replace(/\D/g, ''),
    p_cliente_email: clientData.email || null,
    p_servicos: bookingData.service_ids,
    p_data: bookingData.booking_date,
    p_hora: bookingData.booking_time,
    p_preco_total: bookingData.total_price,
    p_duracao_total: bookingData.total_duration,
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

/** Busca agendamentos, opcionalmente filtrados por data. */
export const getBookings = async (date?: string) => {
  let query = supabase
    .from('bookings')
    .select(
      `
      *,
      clients (
        name,
        phone
      )
    `
    )
    .order('booking_time', { ascending: true });

  if (date) {
    query = query.eq('booking_date', date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/** Atualiza o status de um agendamento. */
export const updateBookingStatus = async (
  id: string,
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending'
) => {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);

  if (error) throw error;
};

/** Exclui permanentemente um agendamento pelo ID. */
export const deleteBooking = async (id: string) => {
  const { error } = await supabase.from('bookings').delete().eq('id', id);

  if (error) throw error;
};

/** Busca agendamentos futuros pelo telefone do cliente (para cancelamento público). */
export const getBookingsByPhone = async (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, booking_date, booking_time, status, total_price, service_ids, total_duration, clients!inner(name, phone)'
    )
    .gte('booking_date', today)
    .in('status', ['pending', 'confirmed'])
    .eq('clients.phone', cleanPhone)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (error) throw error;
  return data || [];
};

/** Busca o último agendamento do cliente (para sugestão de repetição). */
export const getLastBookingByPhone = async (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');

  const { data, error } = await supabase
    .from('bookings')
    .select('service_ids, total_price')
    .eq('clients.phone', cleanPhone)
    .in('status', ['pending', 'confirmed', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
};

/** Cancela um agendamento (status → cancelled). */
export const cancelBooking = async (id: string) => {
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
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

/** Marca como concluídos os agendamentos cujo horário já passou. */
export const autoCompleteExpiredBookings = async (date: string): Promise<number> => {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, booking_time, total_duration, status')
    .eq('booking_date', date)
    .in('status', ['confirmed', 'pending'])
    .eq('is_blocked', false);

  if (error || !bookings || bookings.length === 0) return 0;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  });
  const [h, m] = formatter.format(now).split(':').map(Number);
  const currentTimeMinutes = h * 60 + m;

  const expiredIds: string[] = [];

  for (const booking of bookings) {
    const [hours, minutes] = booking.booking_time.slice(0, 5).split(':').map(Number);
    const bookingEndMinutes = hours * 60 + minutes + (booking.total_duration || 60);

    if (currentTimeMinutes >= bookingEndMinutes) {
      expiredIds.push(booking.id);
    }
  }

  if (expiredIds.length === 0) return 0;

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .in('id', expiredIds);

  if (updateError) return 0;
  return expiredIds.length;
};

/** Busca todos os bookings para cálculo de estatísticas. */
export const getBookingsForStats = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, client_id, booking_date, booking_time, total_price, status')
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

/** Marca todos os agendamentos ativos como concluídos (reset de dados). */
export const completeAllActiveBookings = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .in('status', ['confirmed', 'pending'])
    .eq('is_blocked', false)
    .select('id');
  if (error) throw error;
  return data?.length || 0;
};

/** Exclui todos os agendamentos permanentemente. */
export const deleteAllBookings = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('bookings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
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
