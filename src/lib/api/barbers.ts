import { supabase } from '../supabase';
import type { Barber } from '../../types';

/** Busca barbeiros ativos para exibição pública (cliente escolhe ao agendar). */
export const getActiveBarbers = async (): Promise<Barber[]> => {
  const { data, error } = await supabase.rpc('get_active_barbers');
  if (error) throw error;
  return (data || []).map((b: Record<string, unknown>) => ({
    id: b.id as string,
    name: b.name as string,
    photo_url: b.photo_url as string | undefined,
    commission: 0,
    working_days: {},
    is_active: true,
    sort_order: (b.sort_order as number) || 0,
    created_at: '',
  }));
};

/** Busca todos os barbeiros (admin — inclui inativos). */
export const getAllBarbers = async (): Promise<Barber[]> => {
  const { data, error } = await supabase.rpc('get_all_barbers');
  if (error) throw error;
  return (data || []).map((b: Record<string, unknown>) => ({
    id: b.id as string,
    name: b.name as string,
    phone: b.phone as string | undefined,
    photo_url: b.photo_url as string | undefined,
    commission: Number(b.commission || 0),
    working_days: (b.working_days as Record<string, { enabled: boolean }>) || {},
    is_active: b.is_active as boolean,
    sort_order: (b.sort_order as number) || 0,
    created_at: (b.created_at as string) || '',
  }));
};

/** Cria um novo barbeiro. */
export const createBarber = async (data: Omit<Barber, 'id' | 'created_at'>): Promise<Barber> => {
  const { data: newBarber, error } = await supabase
    .from('barbers')
    .insert({
      name: data.name,
      phone: data.phone || null,
      photo_url: data.photo_url || null,
      commission: data.commission,
      working_days: data.working_days,
      is_active: data.is_active,
      sort_order: data.sort_order,
    })
    .select()
    .single();

  if (error) throw error;
  return newBarber as Barber;
};

/** Atualiza um barbeiro existente. */
export const updateBarber = async (
  id: string,
  data: Partial<Omit<Barber, 'id' | 'created_at'>>
): Promise<void> => {
  const { error } = await supabase.from('barbers').update(data).eq('id', id);
  if (error) throw error;
};

/** Remove um barbeiro. */
export const deleteBarber = async (id: string): Promise<void> => {
  const { error } = await supabase.from('barbers').delete().eq('id', id);
  if (error) throw error;
};

/** Busca estatísticas de comissão de um barbeiro. */
export const getBarberStats = async (
  barberId: string,
  startDate: string,
  endDate: string
): Promise<{
  total_bookings: number;
  total_revenue: number;
  total_commission: number;
  completed_count: number;
}> => {
  const { data, error } = await supabase.rpc('get_barber_stats', {
    p_barber_id: barberId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return {
    total_bookings: Number(data?.[0]?.total_bookings || 0),
    total_revenue: Number(data?.[0]?.total_revenue || 0),
    total_commission: Number(data?.[0]?.total_commission || 0),
    completed_count: Number(data?.[0]?.completed_count || 0),
  };
};
