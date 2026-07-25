import { supabase } from '../supabase';
import type { MensalistaPlan } from '../../types';
import { logError } from '../logger';

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

/** Busca TODOS os planos (inclusive inativos) para administração. */
export const getAllMensalistaPlans = async (): Promise<MensalistaPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('mensalista_plans')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as MensalistaPlan[];
  } catch (e) {
    logError(e);
    return [];
  }
};

/** Cria um novo plano mensalista. */
export const createMensalistaPlan = async (plan: {
  name: string;
  price: number;
  included_service_ids: string[];
  allowed_days?: number[];
  duration_days?: number;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
}): Promise<MensalistaPlan> => {
  const { data, error } = await supabase
    .from('mensalista_plans')
    .insert({
      name: plan.name,
      price: plan.price,
      included_service_ids: plan.included_service_ids,
      allowed_days: plan.allowed_days || [1, 2, 3, 4, 5, 6],
      duration_days: plan.duration_days || 30,
      is_active: plan.is_active ?? true,
      is_default: plan.is_default ?? false,
      sort_order: plan.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MensalistaPlan;
};

/** Atualiza um plano mensalista existente. */
export const updateMensalistaPlan = async (
  id: string,
  updates: Partial<{
    name: string;
    price: number;
    included_service_ids: string[];
    allowed_days: number[];
    duration_days: number;
    is_active: boolean;
    is_default: boolean;
    sort_order: number;
  }>
): Promise<void> => {
  const { error } = await supabase.from('mensalista_plans').update(updates).eq('id', id);

  if (error) throw error;
};

/** Remove um plano mensalista e desativa clientes vinculados. */
export const deleteMensalistaPlan = async (id: string): Promise<void> => {
  // Desativa clientes vinculados
  const { error: clientError } = await supabase
    .from('clients')
    .update({ is_mensalista: false, mensalista_plan_id: null, mensalista_expires_at: null })
    .eq('mensalista_plan_id', id);

  if (clientError) throw clientError;

  // Remove o plano
  const { error } = await supabase.from('mensalista_plans').delete().eq('id', id);

  if (error) throw error;
};

/** Busca o nome de um plano pelo ID. */
export const getMensalistaPlanName = async (planId: string): Promise<string | null> => {
  try {
    const { data } = await supabase
      .from('mensalista_plans')
      .select('name')
      .eq('id', planId)
      .maybeSingle();

    return data?.name || null;
  } catch (e) {
    logError(e);
    return null;
  }
};

/** Busca serviços inclusos em um plano. */
export const getMensalistaPlanServices = async (planId: string): Promise<string[]> => {
  try {
    const { data } = await supabase
      .from('mensalista_plans')
      .select('included_service_ids')
      .eq('id', planId)
      .maybeSingle();

    return (data?.included_service_ids as string[]) || [];
  } catch (e) {
    logError(e);
    return [];
  }
};
