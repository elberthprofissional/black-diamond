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
