import { supabase } from '../supabase';
import { getLocalDateString } from '../utils';
import { logError } from '../../lib/logger';

/** Busca o limite de faltas configurado (padrão: 3) */
export const getMaxNoShows = async (): Promise<number> => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'max_no_shows')
      .maybeSingle();
    return data?.value ? parseInt(data.value, 10) : 3;
  } catch (e) {
    logError(e);
    return 3;
  }
};

/** Conta quantas faltas um cliente teve nos últimos N dias */
export const getClientNoShowCount = async (
  clientId: string,
  days: number = 90
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('no_show', true)
      .gte('booking_date', getLocalDateString(new Date(Date.now() - days * 24 * 60 * 60 * 1000)));
    if (error) throw error;
    return count || 0;
  } catch (e) {
    logError(e);
    return 0;
  }
};

/**
 * Verifica se o cliente atingiu o limite de faltas e cria uma notificação pro barbeiro
 * com opção de contato direto via WhatsApp.
 * Retorna true se atingiu o limite.
 */
export const checkAndNotifyNoShowLimit = async (
  clientId: string,
  clientName: string,
  clientPhone?: string
): Promise<boolean> => {
  try {
    const [maxNoShows, noShowCount] = await Promise.all([
      getMaxNoShows(),
      getClientNoShowCount(clientId),
    ]);

    if (noShowCount < maxNoShows) return false;

    // Busca o usuário autenticado (barbeiro/admin)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return true;

    // Verifica se já existe uma notificação pendente pra este cliente (evita spam)
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('tag', `no_show_alert_${clientId}`)
      .maybeSingle();

    if (existing) return true;

    // Cria a notificação em formato JSON estruturado
    const body = JSON.stringify({
      clientName,
      clientPhone: clientPhone || '',
      noShowCount,
      services: `${noShowCount} falta(s) acumulada(s)`,
      dateTime: '-',
      totalPrice: '-',
      manageUrl: '/admin/clients',
    });

    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      title: `📢 ${clientName} acumulou ${noShowCount} falta(s)`,
      body,
      tag: `no_show_alert_${clientId}`,
      url: '/admin/clients',
    });

    if (error) throw error;
    return true;
  } catch (e) {
    logError(e);
    return false;
  }
};
