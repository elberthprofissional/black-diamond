import { useState, useEffect, memo, type FC } from 'react';
import { ImageIcon } from 'lucide-react';
import { getGalleryImages } from '../lib/api/gallery';
import { logError } from '../lib/logger';

interface GalleryImage {
  id: string;
  image_url: string;
  alt: string;
  position: number;
}

const PLACEHOLDER_POLAROIDS = [
  {
    transform: 'rotate-[-8deg] translate-y-2 z-10',
  },
  {
    transform: 'rotate-[0deg] z-10',
  },
  {
    transform: 'rotate-[16deg] z-20',
  },
];

const Gallery: FC = memo(() => {
  const [images, setImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    getGalleryImages()
      .then((data) => {
        if (data) setImages(data as GalleryImage[]);
      })
      .catch((e) => logError(e));
  }, []);

  // Pula as 2 primeiras fotos (usadas no Hero) e mostra as próximas 3
  const galleryImages = images.slice(2, 5);
  const displayItems = Array.from({ length: 3 }).map((_, idx) => {
    const img = galleryImages[idx];
    if (img) {
      const transform =
        idx === 0
          ? 'rotate-[-8deg] translate-y-2 z-10'
          : idx === 1
            ? 'rotate-[0deg] z-10'
            : 'rotate-[16deg] z-20';
      return { type: 'image' as const, url: img.image_url, title: img.alt || '', transform };
    }
    return { type: 'placeholder' as const, transform: PLACEHOLDER_POLAROIDS[idx]!.transform };
  });

  return (
    <section
      id="galeria"
      className="py-24 md:py-32 bg-[#0a0a0a] border-t border-white/[0.06] text-white relative overflow-x-clip"
    >
      <div className="container mx-auto px-6 max-w-6xl text-center">
        {/* Header */}
        <div className="mb-12 md:mb-16 space-y-2">
          <span className="text-[11px] font-sans font-bold uppercase tracking-[0.35em] text-zinc-400 block">
            Galeria
          </span>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-bold uppercase tracking-tight font-sans">
            <span>Meus</span>{' '}
            <span className="font-serif italic font-normal text-white lowercase">trabalhos</span>
          </h2>
        </div>

        {/* Polaroid Showcase */}
        <div className="flex flex-row items-center justify-center gap-0 max-w-5xl mx-auto py-6 px-4 sm:px-6 md:px-8">
          {displayItems.map((item, index) => (
            <div
              key={index}
              className={`shrink-0 relative w-[130px] sm:w-[240px] md:w-[310px] bg-white p-2 sm:p-3.5 pt-3 sm:pt-4 pb-5 sm:pb-8 shadow-[0_15px_30px_rgba(0,0,0,0.7)] ${item.transform} ${
                index === 0
                  ? '-mr-4 sm:-mr-12 md:-mr-16'
                  : index === 2
                    ? '-ml-4 sm:-ml-12 md:-ml-16'
                    : ''
              }`}
            >
              {/* Adhesive tape effect at top center */}
              <div className="tape-effect !w-[60px] sm:!w-[90px] !h-[18px] sm:!h-[26px] !-top-2.5" />

              {/* Photo Frame */}
              <div className="aspect-[4/5] bg-zinc-900 overflow-hidden relative border border-zinc-200 shadow-inner flex items-center justify-center">
                {item.type === 'image' ? (
                  <img
                    src={(item as { url: string }).url}
                    alt={(item as { title: string }).title || 'Foto de corte'}
                    loading="lazy"
                    sizes="(max-width: 640px) 130px, (max-width: 768px) 240px, 310px"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-600">
                    <ImageIcon size={28} className="sm:size-10" />
                    <span className="text-[8px] sm:text-[10px] font-sans font-medium uppercase tracking-wider">
                      Adicione fotos
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default Gallery;
