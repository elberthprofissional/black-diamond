import { supabase } from '../supabase';
import type { GalleryImage } from '../../types';
import { logError } from '../logger';

/** Busca todas as imagens da galeria ordenadas por posição. */
export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  const { data } = await supabase
    .from('gallery_images')
    .select('id, image_url, alt, position, created_at')
    .order('position', { ascending: true });

  return (data || []) as GalleryImage[];
};

/** Faz upload de uma imagem para o storage da galeria. */
export const uploadGalleryImage = async (file: Blob, filePath: string): Promise<string> => {
  const { error: uploadError } = await supabase.storage
    .from('gallery')
    .upload(filePath, file, { contentType: 'image/webp' });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(filePath);
  return (
    urlData?.publicUrl ??
    `${supabase.storage.from('gallery').getPublicUrl(filePath).data.publicUrl}?t=${Date.now()}`
  );
};

/** Insere um registro de imagem na tabela gallery_images. */
export const insertGalleryImage = async (image: {
  image_url: string;
  alt?: string;
  position: number;
}) => {
  const { error } = await supabase.from('gallery_images').insert({
    image_url: image.image_url,
    alt: image.alt ?? '',
    position: image.position,
  });

  if (error) throw error;
};

/** Atualiza a posição de uma imagem. Retorna true se sucesso, false se erro. */
export const updateGalleryPosition = async (id: string, position: number): Promise<boolean> => {
  const { error } = await supabase.from('gallery_images').update({ position }).eq('id', id);

  if (error) {
    logError(error);
    return false;
  }
  return true;
};

/** Deleta uma imagem da galeria (banco + storage). */
export const deleteGalleryImage = async (id: string, imageUrl: string) => {
  // Remove do banco
  const { error: dbError } = await supabase.from('gallery_images').delete().eq('id', id);
  if (dbError) throw dbError;

  // Tenta remover do storage (falha silenciosa se não conseguir)
  try {
    const path = imageUrl.split('/').pop();
    if (path) {
      await supabase.storage.from('gallery').remove([`gallery/${path}`]);
    }
  } catch (e) {
    logError(e);
  }
};
