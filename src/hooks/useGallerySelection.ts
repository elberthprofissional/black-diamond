import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import type { GalleryImage } from './useGalleryData';

export function useGallerySelection(
  images: GalleryImage[],
  setImages: React.Dispatch<React.SetStateAction<GalleryImage[]>>
) {
  const { showSuccess, showError } = useToast();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const isSelecting = selectionMode || selectedImages.length > 0;

  // Long press handlers
  const handleLongPressStart = useCallback((imageId: string) => {
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setSelectionMode(true);
      setSelectedImages((prev) => (prev.includes(imageId) ? prev : [...prev, imageId]));
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleLongPressMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressTriggered.current = false;
  }, []);

  const checkAndClearLongPress = useCallback((): boolean => {
    const was = longPressTriggered.current;
    longPressTriggered.current = false;
    return was;
  }, []);

  // Toggle selection
  const toggleSelect = useCallback((imageId: string, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setSelectedImages((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    );
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedImages([]);
    setSelectionMode(false);
  }, []);

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedImages(images.map((img) => img.id));
        setSelectionMode(true);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImages.length > 0) {
        e.preventDefault();
        setConfirmBulkDelete(true);
      }
      if (e.key === 'Escape' && isSelecting) {
        setSelectedImages([]);
        setSelectionMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, selectedImages, isSelecting]);

  // Bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedImages.length === 0) return;
    try {
      for (const id of selectedImages) {
        await supabase.from('gallery_images').delete().eq('id', id);
      }
      showSuccess(`${selectedImages.length} foto(s) removida(s)!`);
      setImages((prev) => prev.filter((img) => !selectedImages.includes(img.id)));
      setSelectedImages([]);
    } catch {
      showError('Erro ao deletar fotos');
    } finally {
      setConfirmBulkDelete(false);
    }
  }, [selectedImages, showSuccess, showError, setImages]);

  // Single delete
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
      } catch {
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
    confirmBulkDelete,
    deleting,
    isSelecting,
    handleLongPressStart,
    handleLongPressEnd,
    handleLongPressMove,
    checkAndClearLongPress,
    toggleSelect,
    clearSelection,
    handleBulkDelete,
    handleDelete,
    setSelectionMode,
    setConfirmBulkDelete,
    setSelectedImages,
  };
}
