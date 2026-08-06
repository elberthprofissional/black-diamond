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

interface UpsertBarberInput {
  id?: string;
  name: string;
  phone?: string;
  photo_url?: string;
  bio?: string;
  quote?: string;
  is_active?: boolean;
  is_owner?: boolean;
  sort_order?: number;
}

/** Cria ou atualiza um barbeiro (somente admin — RPC upsert_barber). */
export async function upsertBarber(input: UpsertBarberInput): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_barber', {
    p_id: input.id ?? null,
    p_user_id: null,
    p_name: input.name,
    p_phone: input.phone ?? null,
    p_photo_url: input.photo_url ?? null,
    p_bio: input.bio ?? null,
    p_quote: input.quote ?? null,
    p_is_active: input.is_active ?? true,
    p_is_owner: input.is_owner ?? false,
    p_sort_order: input.sort_order ?? 0,
  });
  if (error) throw error;
  return data as string;
}

/** Desativa (soft delete) ou remove definitivamente um barbeiro (somente admin). */
export async function deleteBarber(barberId: string, hard = false): Promise<void> {
  const { error } = await supabase.rpc('delete_barber', {
    p_barber_id: barberId,
    p_hard: hard,
  });
  if (error) throw error;
}
