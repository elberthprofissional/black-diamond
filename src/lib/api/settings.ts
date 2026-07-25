import { supabase } from '../supabase';
import type { MensalistaPlan } from '../../types';
import { logError } from '../logger';

/** Busca configurações por chaves específicas. */
export const getSettings = async (keys: string[]) => {
  const { data, error } = await supabase.from('settings').select('key, value').in('key', keys);

  if (error) throw error;
  return data || [];
};

/** Busca uma configuração por chave. */
export const getSetting = async (key: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;
  return data?.value ?? null;
};

/** Salva uma configuração (upsert). */
export const upsertSetting = async (key: string, value: string) => {
  const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });

  if (error) throw error;
};

/** Salva múltiplas configurações de uma vez. */
export const upsertSettings = async (entries: { key: string; value: string }[]) => {
  const { error } = await supabase.from('settings').upsert(entries, { onConflict: 'key' });

  if (error) throw error;
};

/** Busca working_days + barber_hours em uma chamada só. */
export const getWorkSettings = async (): Promise<{
  workingDays: string;
  barberHours: string;
}> => {
  const data = await getSettings(['working_days', 'barber_hours']);
  const result = { workingDays: '1,2,3,4,5,6', barberHours: '' };

  for (const row of data) {
    if (row.key === 'working_days' && row.value) result.workingDays = row.value;
    else if (row.key === 'barber_hours' && row.value) result.barberHours = row.value;
  }

  return result;
};

/** Busca todos os planos mensalistas ativos. */
export const getMensalistaPlans = async (): Promise<MensalistaPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('mensalista_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as MensalistaPlan[];
  } catch (e) {
    logError(e);
    return [];
  }
};

/** Busca as preferências de notificação do usuário. */
export const getNotificationPrefs = async <T>(key: string, defaults: T): Promise<T> => {
  try {
    const val = await getSetting(key);
    if (val) {
      return { ...defaults, ...JSON.parse(val) };
    }
  } catch (e) {
    logError(e);
  }
  return defaults;
};

/** Busca todos os serviços (para SettingsServicos). */
export const getServicesRaw = async () => {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, price')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

/** Cria um serviço. */
export const createService = async (service: { name: string; price: number; duration: number }) => {
  const { error } = await supabase.from('services').insert(service);
  if (error) throw error;
};

/** Atualiza um serviço. */
export const updateService = async (
  id: string,
  updates: { name?: string; price?: number; duration?: number }
) => {
  const { error } = await supabase.from('services').update(updates).eq('id', id);
  if (error) throw error;
};

/** Deleta um serviço. */
export const deleteService = async (id: string) => {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
};
