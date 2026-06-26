import { supabase } from './supabase';
import type { Service, Booking } from '../types';

// Services
export const getServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  
  if (!data) return [];
  
  // Deduplicate by name
  const uniqueData: Service[] = [];
  const seenNames = new Set<string>();
  
  for (const service of data) {
    if (!seenNames.has(service.name)) {
      seenNames.add(service.name);
      uniqueData.push(service);
    }
  }
  
  return uniqueData;
};

// Bookings
export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'created_at' | 'status' | 'client_id'>,
  clientData: { name: string; phone: string; email?: string }
) => {
  const { data, error } = await supabase.rpc('criar_agendamento', {
    p_cliente_nome: clientData.name,
    p_cliente_telefone: clientData.phone,
    p_cliente_email: clientData.email || null,
    p_servicos: bookingData.service_ids,
    p_data: bookingData.booking_date,
    p_hora: bookingData.booking_time,
    p_preco_total: bookingData.total_price,
    p_duracao_total: bookingData.total_duration
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('Este horário acabou de ser preenchido')) {
      throw new Error('Este horário acabou de ser preenchido. Por favor, escolha outro.');
    }
    if (msg.toLowerCase().includes('limite de 3 agendamentos')) {
      throw new Error('Limite de 3 agendamentos por dia atingido para este telefone.');
    }
    throw error;
  }
  
  return Array.isArray(data) ? data : [data];
};

export const getAvailableSlots = async (date: string) => {
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_date: date
  });
  if (error) throw error;
  return (data || []).map((item: { slot_time: string }) => (item?.slot_time ?? '').slice(0, 5));
};

export const getBookings = async (date?: string) => {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      clients (
        name,
        phone
      )
    `)
    .order('booking_time', { ascending: true });

  if (date) {
    query = query.eq('booking_date', date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const updateBookingStatus = async (id: string, status: 'confirmed' | 'completed' | 'cancelled' | 'pending') => {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteBooking = async (id: string) => {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const toggleSlotBlock = async (date: string, time: string) => {
  const { data, error } = await supabase.rpc('toggle_slot_block', {
    p_date: date,
    p_time: time
  });
  if (error) throw error;
  return data;
};

export const unblockDay = async (date: string) => {
  const { error } = await supabase.rpc('unblock_day', {
    p_date: date
  });
  if (error) throw error;
};

// Clients
export const getClients = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const deleteClient = async (id: string) => {
  const { error } = await supabase
    .from('clients')
    .update({ name: 'CLIENTE_EXCLUIDO', phone: '00000000000' })
    .eq('id', id);

  if (error) throw error;
};

export const createClient = async (data: { name: string; phone: string; email?: string; notes?: string }) => {
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return newClient;
};

export const updateClient = async (id: string, data: { name: string; phone: string; email?: string }) => {
  const { error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id);
  
  if (error) throw error;
};

export const updateClientNotes = async (id: string, notes: string) => {
  const { error } = await supabase
    .from('clients')
    .update({ notes })
    .eq('id', id);

  if (error) throw error;
};

// Reviews
export const submitReview = async (bookingId: string, clientId: string, rating: number, comment?: string) => {
  const { error } = await supabase
    .from('reviews')
    .insert({ booking_id: bookingId, client_id: clientId, rating, comment: comment || null });

  if (error) throw error;
};

export const getAverageRating = async () => {
  const { data, error } = await supabase.rpc('get_average_rating');
  if (error) throw error;
  return data as { average: number; total: number };
};

export const getTopReviews = async (limit = 10) => {
  const { data, error } = await supabase.rpc('get_top_reviews', { p_limit: limit });
  if (error) throw error;
  return data || [];
};


