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
  
  // Deduplicate by name and filter out "Sobrancelha"
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
  clientData: { name: string; phone: string }
) => {
  const { data, error } = await supabase.rpc('criar_agendamento', {
    p_cliente_nome: clientData.name,
    p_cliente_telefone: clientData.phone,
    p_servicos: bookingData.service_ids,
    p_data: bookingData.booking_date,
    p_hora: bookingData.booking_time,
    p_preco_total: bookingData.total_price,
    p_duracao_total: bookingData.total_duration
  });

  if (error) {
    if (error.message && error.message.includes('Este horário acabou de ser preenchido')) {
      throw new Error('Este horário acabou de ser preenchido. Por favor, escolha outro.');
    }
    if (error.message && error.message.includes('limite de agendamentos')) {
      throw new Error('Você já atingiu o limite de agendamentos para este dia. Máximo 3 por dia.');
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
  return (data || []).map((item: { slot_time: string }) => item.slot_time);
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

export const updateBookingStatus = async (id: string, status: string) => {
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
    .delete()
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


