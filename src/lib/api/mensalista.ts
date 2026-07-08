import { supabase } from '../supabase';
import type { MensalistaPlan } from '../../types';

/** Busca todos os planos mensalistas (admin: todos, público: apenas ativos). */
export const getMensalistaPlans = async (activeOnly = false): Promise<MensalistaPlan[]> => {
  let query = supabase
    .from('mensalista_plans')
    .select('*')
    .order('sort_order', { ascending: true });
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as MensalistaPlan[];
};

/** Cria um novo plano mensalista. */
export const createMensalistaPlan = async (plan: {
  name: string;
  price: number;
  included_service_ids: string[];
  allowed_days: number[];
  is_active?: boolean;
}): Promise<MensalistaPlan> => {
  const { data, error } = await supabase
    .from('mensalista_plans')
    .insert({
      name: plan.name,
      price: plan.price,
      included_service_ids: plan.included_service_ids,
      allowed_days: plan.allowed_days,
      is_active: plan.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MensalistaPlan;
};

/** Atualiza um plano mensalista. */
export const updateMensalistaPlan = async (
  id: string,
  data: {
    name?: string;
    price?: number;
    included_service_ids?: string[];
    allowed_days?: number[];
    is_active?: boolean;
    sort_order?: number;
  }
): Promise<void> => {
  const { error } = await supabase.from('mensalista_plans').update(data).eq('id', id);
  if (error) throw error;
};

/** Exclui um plano mensalista. */
export const deleteMensalistaPlan = async (id: string): Promise<void> => {
  const { error } = await supabase.from('mensalista_plans').delete().eq('id', id);
  if (error) throw error;
};

/** Alterna o status ativo/inativo de um plano mensalista. */
export const toggleMensalistaPlan = async (id: string, isActive: boolean): Promise<void> => {
  const { error } = await supabase
    .from('mensalista_plans')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
};

/** Busca a configuração de mensalista ativo/desativo. */
export const getMensalistaEnabled = async (): Promise<boolean> => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'mensalista_enabled')
    .maybeSingle();
  if (error) throw error;
  return data?.value === 'true';
};

/** Atualiza a configuração de mensalista ativo/desativo. */
export const setMensalistaEnabled = async (enabled: boolean): Promise<void> => {
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'mensalista_enabled', value: String(enabled) }, { onConflict: 'key' });
  if (error) throw error;
};
