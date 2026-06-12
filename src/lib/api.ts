import { supabase } from './supabase';
import type { Service, Booking, Client } from '../types';

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
  clientData: Omit<Client, 'id' | 'created_at'>
) => {
  // 1. First, find or create the client
  let { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', clientData.phone)
    .single();

  if (clientError && clientError.code !== 'PGRST116') throw clientError;

  if (!client) {
    const { data: newClient, error: createClientError } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();
    
    if (createClientError) throw createClientError;
    client = newClient;
  }

  // 2. Create the booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert([
      {
        client_id: client?.id,
        service_ids: bookingData.service_ids,
        booking_date: bookingData.date,
        booking_time: bookingData.time,
        total_price: bookingData.total_price,
        total_duration: bookingData.total_duration,
        status: 'pending',
        notes: bookingData.notes
      }
    ])
    .select()
    .single();

  if (bookingError) throw bookingError;
  return booking;
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
