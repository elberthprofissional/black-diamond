import { supabase } from '../supabase';
import type { Barber } from '../../types';

export async function getBarbers(): Promise<Barber[]> {
  const { data, error } = await supabase.rpc('get_barbers');
  if (error) throw error;
  return (data || []) as Barber[];
}

export async function getBarberByUserId(userId: string): Promise<Barber | null> {
  const { data, error } = await supabase.rpc('get_barber_by_user_id', {
    p_user_id: userId,
  });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as Barber;
}

export async function upsertBarber(barber: Partial<Barber>): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_barber', {
    p_id: barber.id || null,
    p_user_id: barber.user_id || null,
    p_name: barber.name || null,
    p_phone: barber.phone || null,
    p_photo_url: barber.photo_url || null,
    p_bio: barber.bio || null,
    p_quote: barber.quote || null,
    p_is_active: barber.is_active ?? true,
    p_is_owner: barber.is_owner ?? false,
    p_sort_order: barber.sort_order ?? 0,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteBarber(barberId: string, hard = false): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_barber', {
    p_barber_id: barberId,
    p_hard: hard,
  });
  if (error) throw error;
  return data as boolean;
}
