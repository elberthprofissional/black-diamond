import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ImageIcon } from 'lucide-react';
import GalleryLightbox from './GalleryLightbox';

interface GalleryImage {
  image_url: string;
  alt: string;
}

const Gallery: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase
        .from('gallery_images')
        .select('image_url, alt')
        .order('position', { ascending: true });

      if (data && data.length > 0) {
        setImages(data);
      }
    };

    fetchImages();
  }, []);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleDeleteImage = async (image: GalleryImage) => {
    try {
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .eq('image_url', image.image_url);

      if (!error) {
        setImages((prev) => prev.filter((img) => img.image_url !== image.image_url));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Double the images for infinite scroll effect
  const displayImages = [...images, ...images];

  return (
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

      {/* Infinite Scroll Container */}
      <div
        className="relative flex overflow-x-hidden"
        role="region"
        aria-label="Galeria de trabalhos"
        aria-roledescription="carrossel"
      >
        <div className="flex animate-marquee whitespace-nowrap gap-4 md:gap-8 px-4" aria-live="off">
          {images.length === 0 ? (
            <>
              {[...Array(8)].map((_, index) => (
                <div
                  key={`placeholder-${index}`}
                  className="relative w-[280px] md:w-[400px] h-[360px] md:h-[500px] bg-[#1a1a1a] border border-dashed border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center"
                >
                  <ImageIcon size={48} className="text-zinc-700" />
                </div>
              ))}
            </>
          ) : (
            displayImages.map((img, index) => (
              <div
                key={`${img.alt}-${index}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`Foto ${img.alt}`}
                onClick={() => openLightbox(index % images.length)}
                className="relative w-[280px] md:w-[400px] h-[360px] md:h-[500px] bg-[#1a1a1a] overflow-hidden flex-shrink-0 cursor-pointer"
              >
                <img
                  src={img.image_url}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-12 text-center">
        <a
          href="https://www.instagram.com/black.diamond.barbeariaa/"
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

      {/* Lightbox */}
      <GalleryLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onDelete={handleDeleteImage}
      />
    </section>
  );
};

export default Gallery;
