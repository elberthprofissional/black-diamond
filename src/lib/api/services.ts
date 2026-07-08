import { supabase } from '../supabase';
import type { Service } from '../../types';

/** Busca todos os serviços cadastrados, deduplicados por nome. */
export const getServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  const seen = new Set<string>();
  return data.filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
};

/** Cria um novo serviço */
export const createService = async (service: { name: string; price: number }): Promise<boolean> => {
  const { error } = await supabase
    .from('services')
    .insert({ name: service.name, price: service.price, duration: 60 });

  return !error;
};

/** Atualiza um serviço existente */
export const updateService = async (
  id: string,
  data: { name?: string; price?: number }
): Promise<boolean> => {
  const { error } = await supabase.from('services').update(data).eq('id', id);

  return !error;
};

/** Remove um serviço */
export const deleteService = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('services').delete().eq('id', id);

  return !error;
};
