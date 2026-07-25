import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './useToast';
import type { GalleryImage } from '../types';
import { logError } from '../lib/logger';
import { getGalleryImages, uploadGalleryImage, insertGalleryImage } from '../lib/api/gallery';

export type { GalleryImage } from '../types';

const MAX_PHOTOS = 20;

export function useGalleryData() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showError, showSuccess } = useToast();

  const loadImages = useCallback(async () => {
    const data = await getGalleryImages();
    if (data) setImages(data);
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

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
          reject(new Error('Erro ao processar imagem.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error('Erro ao converter imagem.'));
          },
          'image/webp',
          0.92
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Erro ao carregar imagem.'));
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
        const imageUrl = await uploadGalleryImage(webpBlob, filePath);
        const nextPosition = images.length > 0 ? Math.max(...images.map((i) => i.position)) + 1 : 0;
        await insertGalleryImage({ image_url: imageUrl, position: nextPosition });
        showSuccess('Foto adicionada!');
        await loadImages();
      } catch (e) {
        logError(e);
        showError('Erro ao enviar imagem');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [images, convertToWebP, showError, showSuccess, loadImages]
  );

  return {
    images,
    setImages,
    loadImages,
    uploading,
    fileInputRef,
    openFilePicker,
    handleUpload,
    MAX_PHOTOS,
  };
}
