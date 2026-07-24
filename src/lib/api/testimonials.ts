import { supabase } from '../supabase';
import type { Testimonial } from '../../types';

/**
 * Busca depoimentos ativos para o site público.
 * Aplica filtros anti-burro:
 * - Só retorna depoimentos com texto não-vazio (mínimo 10 caracteres)
 * - Só retorna depoimentos com rating válido (1-5)
 * - Ignora depoimentos com nome vazio
 * - Se tudo falhar, retorna array vazio (nunca quebra o slider)
 */
export const getActiveTestimonials = async (): Promise<Testimonial[]> => {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .not('text', 'is', null)
      .neq('text', '')
      .order('publish_time', { ascending: false, nullsFirst: false })
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // Filtro extra de segurança no frontend (anti-burro)
    const valid = (data ?? []).filter(
      (t: Testimonial) =>
        t.text &&
        t.text.trim().length >= 3 &&
        t.name &&
        t.name.trim().length > 0 &&
        t.rating >= 1 &&
        t.rating <= 5
    );

    return valid;
  } catch {
    // Nunca quebra o site — se o banco falhar, mostra vazio
    return [];
  }
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

/**
 * Cria um novo depoimento com validação anti-burro.
 * - text precisa ter pelo menos 3 caracteres
 * - name não pode ser vazio
 * - rating precisa ser entre 1 e 5
 */
export const createTestimonial = async (
  input: Pick<Testimonial, 'name' | 'rating' | 'text'>
): Promise<Testimonial> => {
  const text = (input.text || '').trim();
  const name = (input.name || '').trim();

  if (!name) throw new Error('Nome é obrigatório.');
  if (text.length < 3) throw new Error('O depoimento precisa ter pelo menos 3 caracteres.');
  if (input.rating < 1 || input.rating > 5) throw new Error('Avaliação precisa ser entre 1 e 5.');

  const { data, error } = await supabase
    .from('testimonials')
    .insert({
      name,
      rating: input.rating,
      text,
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


