import { supabase } from '../supabase';
import type { MensalistaPlan } from '../../types';
import { logError } from '../logger';

/** Busca configurações por chaves específicas (uso interno). */
const getSettings = async (keys: string[]) => {
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
