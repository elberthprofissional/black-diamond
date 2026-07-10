import { supabase } from '../supabase';

export interface WhatsAppTemplate {
  id: string;
  key: string;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/** Busca todos os templates de WhatsApp. */
export const getTemplates = async (key: string): Promise<WhatsAppTemplate[]> => {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .eq('key', key)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/** Cria um novo template. */
export const createTemplate = async (
  key: string,
  name: string,
  body: string
): Promise<WhatsAppTemplate> => {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .insert({ key, name, body })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Remove um template pelo id. */
export const deleteTemplate = async (id: string): Promise<void> => {
  const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);

  if (error) throw error;
};
