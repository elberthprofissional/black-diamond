import { useState, useEffect, useCallback } from 'react';
import type { GalleryImage } from './useGalleryData';

export function useGalleryPreview(images: GalleryImage[]) {
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

  const goToPrevPreview = useCallback(() => {
    if (images.length === 0) return;
    const prev = (previewIndex - 1 + images.length) % images.length;
    setPreviewIndex(prev);
    setPreviewImage(images[prev]);
  }, [previewIndex, images]);

  const goToNextPreview = useCallback(() => {
    if (images.length === 0) return;
    const next = (previewIndex + 1) % images.length;
    setPreviewIndex(next);
    setPreviewImage(images[next]);
  }, [previewIndex, images]);

  return {
    previewImage,
    previewIndex,
    touchStart,
    setPreviewImage,
    setPreviewIndex,
    setTouchStart,
    goToPrevPreview,
    goToNextPreview,
  };
}
