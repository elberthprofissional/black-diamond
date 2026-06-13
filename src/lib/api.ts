import { supabase } from './supabase';
import type { Service, Booking } from '../types';

// Services
export const getServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

// Bookings
export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'created_at' | 'status' | 'client_id'>,
  clientData: { name: string; phone: string }
) => {
  // 1. First, find or create the client
  const { data: existingClient, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', clientData.phone)
    .single();

  if (clientError && clientError.code !== 'PGRST116') throw clientError;

  let client = existingClient;

  if (!client) {
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert([clientData])
      .select('id')
      .single();
    
    if (createError) throw createError;
    client = newClient;
  }

  // 2. Create the booking
  const { data, error } = await supabase
    .from('bookings')
    .insert([
      {
        client_id: client.id,
        service_ids: bookingData.service_ids,
        booking_date: bookingData.booking_date,
        booking_time: bookingData.booking_time,
        total_price: bookingData.total_price,
        total_duration: bookingData.total_duration,
        status: 'pending'
      }
    ]);

  if (error) throw error;
  return data;
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
  return data;
};

export const updateBookingStatus = async (id: string, status: string) => {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
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
