import { supabase } from '../supabase';
import type { Service } from '../../types';

/** Busca todos os serviços cadastrados (nomes únicos garantidos por constraint no banco). */
export const getServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};
