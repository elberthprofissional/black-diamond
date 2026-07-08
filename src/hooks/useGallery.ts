import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useGalleryData } from './useGalleryData';
import { useGalleryUpload } from './useGalleryUpload';
import { useGallerySelection } from './useGallerySelection';
import { useGalleryPreview } from './useGalleryPreview';

export type { GalleryImage } from './useGalleryData';

export function useGallery() {
  const { toast, showSuccess, showError } = useToast();
  const { images, setImages, loadImages } = useGalleryData();
  const { uploading, fileInputRef, openFilePicker, handleUpload, MAX_PHOTOS } = useGalleryUpload(
    images,
    loadImages
  );
  const selection = useGallerySelection(images, setImages);
  const preview = useGalleryPreview(images);
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

      const snapshot = [...images];
      const newImages = [...images];
      const tempPos = newImages[idx].position;
      newImages[idx].position = newImages[swapIdx].position;
      newImages[swapIdx].position = tempPos;
      [newImages[idx], newImages[swapIdx]] = [newImages[swapIdx], newImages[idx]];
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
      if (!preview.previewImage || targetPosition === preview.previewImage.position + 1) {
        setShowMoveModal(false);
        return;
      }
      const oldIdx = preview.previewImage.position;
      const newIdx = targetPosition - 1;
      const updated = [...images];
      const [moved] = updated.splice(oldIdx, 1);
      updated.splice(newIdx, 0, moved);
      await Promise.all(
        updated.map((img, i) =>
          supabase.from('gallery_images').update({ position: i }).eq('id', img.id)
        )
      );
      setImages(updated);
      setShowMoveModal(false);
      preview.setPreviewImage(null);
      showSuccess(`Foto movida para posição ${targetPosition}`);
    },
    [preview, images, showSuccess, setImages]
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
    ...selection,

    // Preview
    ...preview,

    // Delete (single)
    confirmDelete,
    setConfirmDelete,
    handleDelete: selection.handleDelete,
    deleting: selection.deleting,

    // Move
    showMoveModal,
    setShowMoveModal,
    moveTarget,
    setMoveTarget,
    handleMove,
    handleMoveToPosition,
  };
}
