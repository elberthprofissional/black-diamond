import { supabase } from '../supabase';

/** Busca o limite de faltas configurado (padrão: 3) */
export const getMaxNoShows = async (): Promise<number> => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'max_no_shows')
      .maybeSingle();
    return data?.value ? parseInt(data.value, 10) : 3;
  } catch {
    return 3;
  }
};

/** Verifica se um cliente está bloqueado por excesso de faltas */
export const isClientNoShowBlocked = async (clientId: string): Promise<boolean> => {
  try {
    const maxNoShows = await getMaxNoShows();
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('no_show', true)
      .gte(
        'booking_date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );
    if (error) throw error;
    return (count || 0) >= maxNoShows;
  } catch {
    return false;
  }
};

/** Busca o cliente por telefone e verifica se está bloqueado por faltas */
export const checkPhoneNoShowBlock = async (
  phone: string
): Promise<{ blocked: boolean; name?: string }> => {
  try {
    const { data: client } = await supabase
      .from('clients')
      .select('id, name')
      .eq('phone', phone)
      .maybeSingle();

    if (!client) return { blocked: false };

    const blocked = await isClientNoShowBlocked(client.id);
    return { blocked, name: client.name };
  } catch {
    return { blocked: false };
  }
};
