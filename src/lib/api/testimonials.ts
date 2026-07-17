import { supabase } from '../supabase';
import type { Testimonial } from '../../types';

/** Busca depoimentos ativos (ordenados por sort_order) - para o site público */
export const getActiveTestimonials = async (): Promise<Testimonial[]> => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/** Busca TODOS os depoimentos (incluindo inativos) - para o admin */
export const getAllTestimonials = async (): Promise<Testimonial[]> => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/** Cria um novo depoimento */
export const createTestimonial = async (
  input: Pick<Testimonial, 'name' | 'rating' | 'text'>
): Promise<Testimonial> => {
  const { data, error } = await supabase
    .from('testimonials')
    .insert({
      name: input.name,
      rating: input.rating,
      text: input.text,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Atualiza um depoimento (is_active, sort_order, etc) */
export const updateTestimonial = async (
  id: string,
  updates: Partial<Pick<Testimonial, 'is_active' | 'sort_order' | 'name' | 'rating' | 'text'>>
): Promise<void> => {
  const { error } = await supabase.from('testimonials').update(updates).eq('id', id);

  if (error) throw error;
};

/** Deleta um depoimento */
export const deleteTestimonial = async (id: string): Promise<void> => {
  const { error } = await supabase.from('testimonials').delete().eq('id', id);

  if (error) throw error;
};

interface SyncResult {
  message: string;
  added: number;
  skipped: number;
  total: number;
  withText: number;
}

/** Sincroniza reviews do Google Places API via Edge Function */
export const syncGoogleReviews = async (): Promise<SyncResult> => {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;

  if (!token) {
    throw new Error('Faça login novamente');
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-google-reviews`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Erro ao sincronizar' }));
    throw new Error(err.error ?? 'Erro ao sincronizar com Google');
  }

  return response.json();
};
