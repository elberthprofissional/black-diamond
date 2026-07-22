import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import type { GalleryImage } from './useGalleryData';
import { logError } from '../lib/logger';

export function useGallerySelection(
  _images: GalleryImage[],
  setImages: React.Dispatch<React.SetStateAction<GalleryImage[]>>
) {
  const { showSuccess, showError } = useToast();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const toggleSelect = useCallback((imageId: string, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setSelectedImages((prev) => {
      const next = prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId];
      if (next.length > 0) setSelectionMode(true);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedImages([]);
    setSelectionMode(false);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedImages.length === 0) return;
    const deletedIds: string[] = [];
    try {
      for (const id of selectedImages) {
        const { error } = await supabase.from('gallery_images').delete().eq('id', id);
        if (!error) deletedIds.push(id);
      }
      if (deletedIds.length > 0) {
        showSuccess(`${deletedIds.length} foto(s) removida(s)!`);
        setImages((prev) => prev.filter((img) => !deletedIds.includes(img.id)));
      }
      if (deletedIds.length < selectedImages.length) {
        showError(`${selectedImages.length - deletedIds.length} foto(s) falharam ao remover`);
      }
      setSelectedImages([]);
      setSelectionMode(false);
    } catch (e) {
      logError(e);
      showError('Erro ao deletar fotos');
    } finally {
      setConfirmBulkDelete(false);
    }
  }, [selectedImages, showSuccess, showError, setImages]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(id);
      try {
        const { error } = await supabase.from('gallery_images').delete().eq('id', id);
        if (error) {
          showError('Erro ao deletar');
          return;
        }
        showSuccess('Foto removida!');
        setImages((prev) => prev.filter((i) => i.id !== id));
      } catch (e) {
        logError(e);
        showError('Erro ao deletar');
      } finally {
        setDeleting(null);
      }
    },
    [showSuccess, showError, setImages]
  );

  return {
    selectedImages,
    selectionMode,
    setSelectionMode,
    confirmBulkDelete,
    setConfirmBulkDelete,
    deleting,
    toggleSelect,
    clearSelection,
    handleBulkDelete,
    handleDelete,
    setSelectedImages,
  };
}
