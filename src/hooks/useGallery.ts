import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';

export interface GalleryImage {
  id: string;
  image_url: string;
  alt: string;
  position: number;
  created_at?: string;
}

const MAX_PHOTOS = 8;

export function useGallery() {
  const { toast, showSuccess, showError } = useToast();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const loadImages = useCallback(async () => {
    const { data } = await supabase
      .from('gallery_images')
      .select('id, image_url, alt, position, created_at')
      .order('position', { ascending: true });

    if (data) setImages(data);
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // --- Long press ---
  const handleLongPressStart = useCallback((imageId: string) => {
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setSelectionMode(true);
      setSelectedImages((prev) =>
        prev.includes(imageId) ? prev : [...prev, imageId]
      );
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

  // --- Keyboard shortcuts for preview ---
  useEffect(() => {
    if (!previewImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        const prev = (previewIndex - 1 + images.length) % images.length;
        setPreviewIndex(prev);
        setPreviewImage(images[prev]);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        const next = (previewIndex + 1) % images.length;
        setPreviewIndex(next);
        setPreviewImage(images[next]);
      } else if (e.key === 'Escape') {
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, previewIndex, images]);

  // --- Keyboard shortcuts for selection ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !previewImage) {
        e.preventDefault();
        setSelectedImages(images.map((img) => img.id));
        setSelectionMode(true);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImages.length > 0 && !previewImage) {
        e.preventDefault();
        setConfirmBulkDelete(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, selectedImages, previewImage]);

  // ESC to clear selection
  useEffect(() => {
    if (selectedImages.length === 0 && !selectionMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImages([]);
        setSelectionMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImages, selectionMode]);

  // --- Selection ---
  const toggleSelect = useCallback((imageId: string, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setSelectedImages((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    );
  }, []);

  // --- Upload ---
  const convertToWebP = useCallback((file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1200;
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
        if (!ctx) { reject(new Error('Could not get canvas context')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => { URL.revokeObjectURL(url); if (blob) resolve(blob); else reject(new Error('Failed to convert to WebP')); },
          'image/webp', 0.85
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
      img.src = url;
    });
  }, []);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showError('Envie apenas imagens'); return; }
    if (file.size > 2 * 1024 * 1024) { showError('Imagem muito grande (max 2MB)'); return; }
    if (images.length >= MAX_PHOTOS) { showError(`Máximo de ${MAX_PHOTOS} fotos`); return; }

    setUploading(true);
    try {
      const webpBlob = await convertToWebP(file);
      const filePath = `gallery/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, webpBlob, { contentType: 'image/webp' });
      if (uploadError) { showError(`Erro: ${uploadError.message}`); return; }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (urlData?.publicUrl) {
        const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        const nextPosition = images.length > 0 ? Math.max(...images.map((i) => i.position)) + 1 : 0;
        const { error: insertError } = await supabase.from('gallery_images').insert({
          image_url: imageUrl, alt: '', position: nextPosition,
        });
        if (insertError) { showError('Erro ao salvar no banco'); return; }
        showSuccess('Foto adicionada!');
        loadImages();
      }
    } catch { showError('Erro ao enviar imagem'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }, [images, convertToWebP, showError, showSuccess, loadImages]);

  // --- Delete ---
  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from('gallery_images').delete().eq('id', id);
      if (error) { showError('Erro ao deletar'); return; }
      showSuccess('Foto removida!');
      setImages((prev) => prev.filter((i) => i.id !== id));
      setPreviewImage(null);
    } catch { showError('Erro ao deletar'); }
    finally { setDeleting(null); setConfirmDelete(null); }
  }, [showSuccess, showError]);

  // --- Bulk delete ---
  const handleBulkDelete = useCallback(async () => {
    if (selectedImages.length === 0) return;
    try {
      for (const id of selectedImages) {
        await supabase.from('gallery_images').delete().eq('id', id);
      }
      showSuccess(`${selectedImages.length} foto(s) removida(s)!`);
      setImages((prev) => prev.filter((img) => !selectedImages.includes(img.id)));
      setSelectedImages([]);
    } catch { showError('Erro ao deletar fotos'); }
    finally { setConfirmBulkDelete(false); }
  }, [selectedImages, showSuccess, showError]);

  // --- Move ---
  const handleMove = useCallback(async (id: string, direction: 'up' | 'down') => {
    const idx = images.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= images.length) return;

    const newImages = [...images];
    const tempPos = newImages[idx].position;
    newImages[idx].position = newImages[swapIdx].position;
    newImages[swapIdx].position = tempPos;
    [newImages[idx], newImages[swapIdx]] = [newImages[swapIdx], newImages[idx]];
    setImages(newImages);

    await Promise.all([
      supabase.from('gallery_images').update({ position: newImages[idx].position }).eq('id', newImages[idx].id),
      supabase.from('gallery_images').update({ position: newImages[swapIdx].position }).eq('id', newImages[swapIdx].id),
    ]);
  }, [images]);

  // --- Move to position (modal) ---
  const handleMoveToPosition = useCallback(async (targetPosition: number) => {
    if (!previewImage || targetPosition === previewImage.position + 1) { setShowMoveModal(false); return; }
    const oldIdx = previewImage.position;
    const newIdx = targetPosition - 1;
    const updated = [...images];
    const [moved] = updated.splice(oldIdx, 1);
    updated.splice(newIdx, 0, moved);
    for (let i = 0; i < updated.length; i++) {
      await supabase.from('gallery_images').update({ position: i }).eq('id', updated[i].id);
    }
    setImages(updated);
    setShowMoveModal(false);
    setPreviewImage(null);
    showSuccess(`Foto movida para posição ${targetPosition}`);
  }, [previewImage, images, showSuccess]);

  // --- Preview navigation ---
  const goToPrevPreview = useCallback(() => {
    const prev = (previewIndex - 1 + images.length) % images.length;
    setPreviewIndex(prev);
    setPreviewImage(images[prev]);
  }, [previewIndex, images]);

  const goToNextPreview = useCallback(() => {
    const next = (previewIndex + 1) % images.length;
    setPreviewIndex(next);
    setPreviewImage(images[next]);
  }, [previewIndex, images]);

  // --- Check if long press just happened (to prevent click after long press) ---
  const checkAndClearLongPress = useCallback((): boolean => {
    const was = longPressTriggered.current;
    longPressTriggered.current = false;
    return was;
  }, []);

  // --- Clear selection mode ---
  const clearSelection = useCallback(() => {
    setSelectedImages([]);
    setSelectionMode(false);
  }, []);

  return {
    // State
    images, toast, uploading, deleting, confirmDelete, previewImage, previewIndex,
    showMoveModal, moveTarget, touchStart, selectedImages,
    confirmBulkDelete, selectionMode, fileInputRef,

    // Actions
    openFilePicker, loadImages, handleUpload, handleDelete, handleBulkDelete,
    handleMove, handleMoveToPosition, handleLongPressStart, handleLongPressEnd,
    handleLongPressMove, toggleSelect, clearSelection, checkAndClearLongPress,
    goToPrevPreview, goToNextPreview,

    // Setters
    setPreviewImage, setPreviewIndex, setShowMoveModal, setMoveTarget,
    setTouchStart, setConfirmDelete, setConfirmBulkDelete, setSelectionMode,
    setSelectedImages, setDeleting, showSuccess,

    // Constants
    MAX_PHOTOS,
  };
}
