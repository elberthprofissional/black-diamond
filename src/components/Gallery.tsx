import { useState, useEffect, useCallback, memo, type FC } from 'react';
import { supabase } from '../lib/supabase';
import { ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Skeleton from './Skeleton';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { useModalA11y } from '../hooks/useModalA11y';

interface GalleryImage {
  id: string;
  image_url: string;
  alt: string;
  position: number;
}

const Gallery: FC = memo(() => {
  const { barberInstagram } = useBarberSettings();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroredImages, setErroredImages] = useState<Set<string>>(new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const closePreview = useCallback(() => setPreviewIndex(null), []);
  const { dialogRef } = useModalA11y(previewIndex !== null, closePreview);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (previewIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPreviewIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPreviewIndex((prev) =>
          prev !== null ? (prev - 1 + images.length) % images.length : null
        );
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPreviewIndex(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, images.length]);

  const openPreview = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  const goNext = useCallback(() => {
    setPreviewIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setPreviewIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
  }, [images.length]);

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
        // gallery load failed
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  const handleImageError = useCallback((id: string) => {
    setErroredImages((prev) => new Set(prev).add(id));
  }, []);

  if (loading) {
    return (
      <section id="galeria" className="py-10 md:py-20 bg-[#0A0A0A]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-6 md:mb-10">
            <Skeleton className="h-3 w-20 mx-auto mb-4" />
            <Skeleton className="h-12 w-64 mx-auto mb-6" />
            <Skeleton className="h-px w-12 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rect" className="w-full h-[250px] md:h-[350px]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="galeria" className="py-10 md:py-20 bg-[#0A0A0A]">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-[#D4AF37] font-bebas text-[10px] md:text-xs tracking-[0.6em] uppercase mb-4">
            Galeria
          </h2>
          <h3 className="text-4xl sm:text-6xl md:text-8xl font-bebas text-white mb-6 tracking-tight uppercase leading-none">
            MEUS <span className="text-[#D4AF37]">TRABALHOS</span>
          </h3>
          <div className="w-12 h-px bg-[#D4AF37]/30 mx-auto" />
        </div>

        {/* Empty */}
        {images.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto">
            {[...Array(4)].map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="aspect-[3/4] bg-[#1a1a1a] border border-dashed border-white/10 flex items-center justify-center"
              >
                <ImageIcon size={32} className="text-zinc-700" />
              </div>
            ))}
          </div>
        )}

        {/* Grid: até 5 fotos */}
        {images.length > 0 && images.length <= 5 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {images.map((img, i) => {
              const isLastOdd = i === images.length - 1 && images.length % 2 === 1;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => openPreview(i)}
                  className={`relative bg-[#1a1a1a] overflow-hidden group aspect-[3/4] cursor-pointer ${
                    isLastOdd ? 'md:col-start-2' : ''
                  }`}
                  aria-label={`Ver foto: ${img.alt || i + 1}`}
                >
                  {erroredImages.has(img.id) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] border border-dashed border-white/10">
                      <ImageIcon size={28} className="text-zinc-700" />
                    </div>
                  ) : (
                    <>
                      <img
                        src={img.image_url}
                        alt={img.alt || `Foto do trabalho ${i + 1}`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => handleImageError(img.id)}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Carousel: 6+ fotos */}
        {images.length >= 6 && (
          <div className="overflow-hidden -mx-6 px-6">
            <div className="flex animate-marquee gap-3 md:gap-4">
              {[...images, ...images].map((img, i) => (
                <button
                  key={`${img.id}-${i}`}
                  type="button"
                  onClick={() => openPreview(i % images.length)}
                  className="relative w-[200px] sm:w-[260px] md:w-[380px] aspect-[3/4] bg-[#1a1a1a] overflow-hidden flex-shrink-0 group cursor-pointer"
                  aria-label={`Ver foto: ${img.alt || (i % images.length) + 1}`}
                >
                  {erroredImages.has(img.id) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] border border-dashed border-white/10">
                      <ImageIcon size={28} className="text-zinc-700" />
                    </div>
                  ) : (
                    <>
                      <img
                        src={img.image_url}
                        alt={img.alt || `Foto do trabalho ${(i % images.length) + 1}`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => handleImageError(img.id)}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {barberInstagram && (
          <div className="mt-8 text-center">
            <a
              href={`https://www.instagram.com/${barberInstagram}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[8px] md:text-[10px] font-medium text-zinc-500 uppercase tracking-[0.4em] hover:text-[#D4AF37] transition-colors duration-300"
            >
              Para mais, siga a gente no{' '}
              <span className="text-[#D4AF37] underline underline-offset-4 decoration-[#D4AF37]/50 hover:decoration-[#D4AF37]">
                Instagram
              </span>
            </a>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {previewIndex !== null && images[previewIndex] && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label="Visualização da foto"
        >
          <div
            ref={dialogRef}
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={closePreview}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              aria-label="Fechar visualização"
            >
              <X size={20} />
            </button>

            {/* Prev */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* Image */}
            <img
              src={images[previewIndex].image_url}
              alt={images[previewIndex].alt || `Foto ${previewIndex + 1}`}
              className="max-w-[90vw] max-h-[85vh] object-contain select-none"
              draggable={false}
            />

            {/* Next */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={goNext}
                className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                aria-label="Próxima foto"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white text-[12px] font-medium">
                {previewIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
});

export default Gallery;
