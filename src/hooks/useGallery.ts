import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useGalleryData } from './useGalleryData';
import type { GalleryImage } from '../types';
import { logError } from '../lib/logger';

export type { GalleryImage } from '../types';

export function useGallery() {
  const { toast, showSuccess, showError } = useToast();
  const { images, setImages, uploading, fileInputRef, openFilePicker, handleUpload, MAX_PHOTOS } =
    useGalleryData();

  // === Preview state ===
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Keyboard navigation for preview
  useEffect(() => {
    if (!previewImage || images.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        const prev = (previewIndex - 1 + images.length) % images.length;
        const img = images[prev];
        if (img) {
          setPreviewIndex(prev);
          setPreviewImage(img);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        const next = (previewIndex + 1) % images.length;
        const img = images[next];
        if (img) {
          setPreviewIndex(next);
          setPreviewImage(img);
        }
      } else if (e.key === 'Escape') {
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, previewIndex, images]);

  const goToPrevPreview = useCallback(() => {
    if (images.length === 0) return;
    const prev = (previewIndex - 1 + images.length) % images.length;
    const img = images[prev];
    if (img) {
      setPreviewIndex(prev);
      setPreviewImage(img);
    }
  }, [previewIndex, images]);

  const goToNextPreview = useCallback(() => {
    if (images.length === 0) return;
    const next = (previewIndex + 1) % images.length;
    const img = images[next];
    if (img) {
      setPreviewIndex(next);
      setPreviewImage(img);
    }
  }, [previewIndex, images]);

  // === Selection state ===
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

  // === Move state ===
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Move up/down
  const handleMove = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      const idx = images.findIndex((i) => i.id === id);
      if (idx === -1) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= images.length) return;

      const snapshot = images.map((img) => ({ ...img }));
      const newImages = [...images];
      const current = newImages[idx];
      const swap = newImages[swapIdx];
      if (!current || !swap) return;
      const tempPos = current.position;
      current.position = swap.position;
      swap.position = tempPos;
      [newImages[idx], newImages[swapIdx]] = [swap, current];
      setImages(newImages);

      const results = await Promise.all([
        supabase
          .from('gallery_images')
          .update({ position: newImages[idx].position })
          .eq('id', newImages[idx].id),
        supabase
          .from('gallery_images')
          .update({ position: newImages[swapIdx].position })
          .eq('id', newImages[swapIdx].id),
      ]);

      if (results.some((r) => r.error)) {
        setImages(snapshot);
        showError('Erro ao reordenar foto');
      }
    },
    [images, setImages, showError]
  );

  // Move to position (modal)
  const handleMoveToPosition = useCallback(
    async (targetPosition: number) => {
      if (!previewImage || targetPosition === previewImage.position + 1) {
        setShowMoveModal(false);
        return;
      }
      const currentIdx = images.findIndex((img) => img.id === previewImage!.id);
      if (currentIdx === -1) {
        setShowMoveModal(false);
        return;
      }
      const newIdx = Math.min(targetPosition - 1, images.length - 1);
      const snapshot = images.map((img) => ({ ...img }));
      const updated = [...images];
      const movedItems = updated.splice(currentIdx, 1);
      const moved = movedItems[0] as GalleryImage | undefined;
      if (!moved) return;
      updated.splice(newIdx, 0, moved);
      const results = await Promise.all(
        updated.map((img, i) =>
          supabase.from('gallery_images').update({ position: i }).eq('id', img.id)
        )
      );
      if (results.some((r) => r.error)) {
        setImages(snapshot);
        showError('Erro ao salvar posicao no servidor.');
      } else {
        showSuccess(`Foto movida para posição ${targetPosition}`);
      }
      setImages(updated);
      setShowMoveModal(false);
      setPreviewImage(null);
    },
    [previewImage, images, showSuccess, showError, setImages]
  );

  return {
    // Data
    images,
    toast,
    MAX_PHOTOS,

    // Upload
    uploading,
    fileInputRef,
    openFilePicker,
    handleUpload,

    // Selection
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

    // Preview
    previewImage,
    previewIndex,
    setPreviewImage,
    setPreviewIndex,
    goToPrevPreview,
    goToNextPreview,
    touchStart,
    setTouchStart,

    // Delete (single)
    confirmDelete,
    setConfirmDelete,

    // Move
    showMoveModal,
    setShowMoveModal,
    moveTarget,
    setMoveTarget,
    handleMove,
    handleMoveToPosition,
  };
}
