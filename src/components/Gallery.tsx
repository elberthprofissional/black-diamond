import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ImageIcon } from 'lucide-react';
import GalleryLightbox from './GalleryLightbox';
import Skeleton from './Skeleton';
import { useBarberSettings } from '../hooks/useBarberSettings';

interface GalleryImage {
  id: string;
  image_url: string;
  alt: string;
  position: number;
}

type DisplayMode = 'empty' | 'featured' | 'grid' | 'carousel';

const Gallery: React.FC = React.memo(() => {
  const { barberInstagram } = useBarberSettings();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('gallery_images')
          .select('id, image_url, alt, position')
          .order('position', { ascending: true });

        if (error) throw error;
        if (data) setImages(data);
      } catch {
        // gallery load failed — show empty state
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Smart display mode based on image count
  const getDisplayMode = (): DisplayMode => {
    if (images.length === 0) return 'empty';
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      if (images.length <= 2) return 'featured';
      if (images.length <= 4) return 'grid';
      return 'carousel';
    }
    if (images.length <= 2) return 'featured';
    if (images.length <= 5) return 'grid';
    return 'carousel';
  };

  const displayMode = getDisplayMode();

  // Double the images only for carousel mode
  const displayImages = displayMode === 'carousel' ? [...images, ...images] : images;

  if (loading) {
    return (
      <section id="galeria" className="py-20 md:py-40 bg-[#0A0A0A]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-10 md:mb-16">
            <Skeleton className="h-3 w-20 mx-auto mb-4" />
            <Skeleton className="h-12 w-64 mx-auto mb-6" />
            <Skeleton className="h-px w-12 mx-auto" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rect"
                className="w-[280px] h-[360px] md:w-[400px] md:h-[500px] flex-shrink-0"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="galeria" className="py-20 md:py-40 bg-[#0A0A0A] overflow-hidden">
        <div className="container mx-auto px-6 mb-10 md:mb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-[#D4AF37] font-bebas text-[10px] md:text-xs tracking-[0.6em] uppercase mb-4">
              Galeria
            </h2>
            <h3 className="text-4xl sm:text-6xl md:text-8xl font-bebas text-white mb-6 tracking-tight uppercase leading-none">
              MEUS <span className="text-[#D4AF37]">TRABALHOS</span>
            </h3>
            <div className="w-12 h-px bg-[#D4AF37]/30 mx-auto"></div>
          </div>
        </div>

        {/* Display Mode: Empty */}
        {displayMode === 'empty' && (
          <div className="flex justify-center gap-4 md:gap-8 px-4">
            {[...Array(4)].map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="relative w-[280px] md:w-[400px] h-[360px] md:h-[500px] bg-[#1a1a1a] border border-dashed border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center"
              >
                <ImageIcon size={48} className="text-zinc-700" />
              </div>
            ))}
          </div>
        )}

        {/* Display Mode: Featured (1-2 photos) */}
        {displayMode === 'featured' && (
          <>
            {/* Mobile: grid */}
            <div
              className={`gap-2 px-4 md:hidden ${
                images.length === 1 ? 'grid grid-cols-1 max-w-md mx-auto' : 'grid grid-cols-2'
              }`}
            >
              {images.map((img, index) => (
                <div
                  key={img.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Foto ${img.alt || index + 1}`}
                  onClick={() => openLightbox(index)}
                  className="relative aspect-[3/4] bg-[#1a1a1a] overflow-hidden cursor-pointer group"
                >
                  <img
                    src={img.image_url}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                </div>
              ))}
            </div>
            {/* Desktop: side by side */}
            <div className="hidden md:flex justify-center gap-10 px-4">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Foto ${img.alt || index + 1}`}
                  onClick={() => openLightbox(index)}
                  className="relative w-[450px] h-[550px] bg-[#1a1a1a] overflow-hidden flex-shrink-0 cursor-pointer group"
                >
                  <img
                    src={img.image_url}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Display Mode: Grid (3-5 photos) */}
        {displayMode === 'grid' && (
          <>
            {/* Mobile: 2 columns grid */}
            <div className="grid grid-cols-2 gap-2 px-4 md:hidden">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Foto ${img.alt || index + 1}`}
                  onClick={() => openLightbox(index)}
                  className="relative aspect-[3/4] bg-[#1a1a1a] overflow-hidden cursor-pointer group"
                >
                  <img
                    src={img.image_url}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                </div>
              ))}
            </div>
            {/* Desktop: horizontal row */}
            <div className="hidden md:flex justify-center gap-4 px-4">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Foto ${img.alt || index + 1}`}
                  onClick={() => openLightbox(index)}
                  className="relative w-[320px] h-[420px] bg-[#1a1a1a] overflow-hidden flex-shrink-0 cursor-pointer group"
                >
                  <img
                    src={img.image_url}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Display Mode: Carousel (6+ photos) */}
        {displayMode === 'carousel' && (
          <div
            className="relative flex overflow-x-hidden"
            role="region"
            aria-label="Galeria de trabalhos"
            aria-roledescription="carrossel"
          >
            <div
              className="flex animate-marquee whitespace-nowrap gap-4 md:gap-8 px-4"
              aria-live="off"
            >
              {displayImages.map((img, index) => (
                <div
                  key={`${img.id}-${index}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Foto ${img.alt || index + 1}`}
                  onClick={() => openLightbox(index % images.length)}
                  className="relative w-[280px] md:w-[400px] h-[360px] md:h-[500px] bg-[#1a1a1a] overflow-hidden flex-shrink-0 cursor-pointer group"
                >
                  <img
                    src={img.image_url}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <a
            href={`https://www.instagram.com/${barberInstagram || 'black.diamond.barbeariaa'}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[8px] md:text-[10px] font-medium text-zinc-600 uppercase tracking-[0.4em] hover:text-[#D4AF37] transition-colors duration-300"
          >
            Para mais, siga a gente no{' '}
            <span className="text-[#D4AF37] underline underline-offset-4 decoration-[#D4AF37]/50 hover:decoration-[#D4AF37]">
              Instagram
            </span>
          </a>
        </div>
      </section>

      {/* Lightbox */}
      <GalleryLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
});

export default Gallery;
