import { supabase } from '../supabase';
import type { Testimonial } from '../../types';

const MAX_TESTIMONIALS = 20;

/** Busca depoimentos ativos (público) */
export const getTestimonials = async (): Promise<Testimonial[]> => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/** Busca todos os depoimentos (admin) */
export const getAllTestimonials = async (): Promise<Testimonial[]> => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/** Conta depoimentos existentes */
export const countTestimonials = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('testimonials')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
};

/** Cria um depoimento */
export const createTestimonial = async (
  testimonial: Pick<Testimonial, 'name' | 'rating' | 'text'>
): Promise<Testimonial> => {
  const total = await countTestimonials();
  if (total >= MAX_TESTIMONIALS) {
    throw new Error(`Limite de ${MAX_TESTIMONIALS} depoimentos atingido.`);
  }

  const { data, error } = await supabase
    .from('testimonials')
    .insert({
      name: testimonial.name,
      rating: testimonial.rating,
      text: testimonial.text,
      sort_order: total + 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Atualiza um depoimento */
export const updateTestimonial = async (
  id: string,
  updates: Partial<Pick<Testimonial, 'name' | 'rating' | 'text' | 'is_active' | 'sort_order'>>
): Promise<Testimonial> => {
  const { data, error } = await supabase
    .from('testimonials')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Deleta um depoimento */
export const deleteTestimonial = async (id: string): Promise<void> => {
  const { error } = await supabase.from('testimonials').delete().eq('id', id);
  if (error) throw error;
};

export { MAX_TESTIMONIALS };
