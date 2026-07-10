import { useState, useEffect, useCallback, memo, type FC } from 'react';
import { supabase } from '../lib/supabase';
import { ImageIcon } from 'lucide-react';
import Skeleton from './Skeleton';
import { useBarberSettings } from '../hooks/useBarberSettings';

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
                <div
                  key={img.id}
                  className={`relative bg-[#1a1a1a] overflow-hidden group aspect-[3/4] ${
                    isLastOdd ? 'md:col-start-2' : ''
                  }`}
                  role="group"
                  aria-label={`Foto ${img.alt || i + 1}`}
                >
                  {erroredImages.has(img.id) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] border border-dashed border-white/10">
                      <ImageIcon size={28} className="text-zinc-700" />
                    </div>
                  ) : (
                    <img
                      src={img.image_url}
                      alt={img.alt}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={() => handleImageError(img.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Carousel: 6+ fotos */}
        {images.length >= 6 && (
          <div className="overflow-hidden -mx-6 px-6">
            <div className="flex animate-marquee gap-3 md:gap-4">
              {[...images, ...images].map((img, i) => (
                <div
                  key={`${img.id}-${i}`}
                  className="relative w-[200px] sm:w-[260px] md:w-[380px] aspect-[3/4] bg-[#1a1a1a] overflow-hidden flex-shrink-0 group"
                  role="group"
                  aria-label={`Foto ${img.alt || (i % images.length) + 1}`}
                >
                  {erroredImages.has(img.id) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] border border-dashed border-white/10">
                      <ImageIcon size={28} className="text-zinc-700" />
                    </div>
                  ) : (
                    <img
                      src={img.image_url}
                      alt={img.alt}
                      loading="eager"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={() => handleImageError(img.id)}
                    />
                  )}
                </div>
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
              className="text-[8px] md:text-[10px] font-medium text-zinc-600 uppercase tracking-[0.4em] hover:text-[#D4AF37] transition-colors duration-300"
            >
              Para mais, siga a gente no{' '}
              <span className="text-[#D4AF37] underline underline-offset-4 decoration-[#D4AF37]/50 hover:decoration-[#D4AF37]">
                Instagram
              </span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
});

export default Gallery;
