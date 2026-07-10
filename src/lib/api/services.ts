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
