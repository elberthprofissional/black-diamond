import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import type { GalleryImage } from './useGalleryData';

const MAX_PHOTOS = 8;

export function useGalleryUpload(images: GalleryImage[], onUploadComplete: () => void) {
  const { showError, showSuccess } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const convertToWebP = useCallback((file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 2048;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error('Failed to convert to WebP'));
          },
          'image/webp',
          0.92
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }, []);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showError('Envie apenas imagens');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showError('Imagem muito grande (max 2MB)');
        return;
      }
      if (images.length >= MAX_PHOTOS) {
        showError(`Máximo de ${MAX_PHOTOS} fotos`);
        return;
      }

      setUploading(true);
      try {
        const webpBlob = await convertToWebP(file);
        const filePath = `gallery/${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, webpBlob, { contentType: 'image/webp' });
        if (uploadError) {
          showError(`Erro: ${uploadError.message}`);
          return;
        }

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        if (urlData?.publicUrl) {
          const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
          const nextPosition =
            images.length > 0 ? Math.max(...images.map((i) => i.position)) + 1 : 0;
          const { error: insertError } = await supabase.from('gallery_images').insert({
            image_url: imageUrl,
            alt: '',
            position: nextPosition,
          });
          if (insertError) {
            showError('Erro ao salvar no banco');
            return;
          }
          showSuccess('Foto adicionada!');
          onUploadComplete();
        }
      } catch {
        showError('Erro ao enviar imagem');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [images, convertToWebP, showError, showSuccess, onUploadComplete]
  );

  return {
    uploading,
    fileInputRef,
    openFilePicker,
    handleUpload,
    MAX_PHOTOS,
  };
}
