import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface GalleryImage {
  id: string;
  image_url: string;
  alt: string;
  position: number;
  created_at?: string;
}

export function useGalleryData() {
  const [images, setImages] = useState<GalleryImage[]>([]);

  const loadImages = useCallback(async () => {
    const { data } = await supabase
      .from('gallery_images')
      .select('id, image_url, alt, position, created_at')
      .order('position', { ascending: true });

    if (data) setImages(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadImages();
  }, [loadImages]);

  return { images, setImages, loadImages };
}
