import { useState, useEffect, memo, type FC, type CSSProperties } from 'react';
import { ImageIcon } from 'lucide-react';
import { getGalleryImages } from '../lib/api/gallery';
import { getBarbers } from '../lib/api/barbers';
import { useBarberSettings } from '../hooks/useBarberSettings';
import type { Barber } from '../types';
import { logError } from '../lib/logger';

interface GalleryImage {
  id: string;
  image_url: string;
  alt: string;
  position: number;
  barber_id?: string | null;
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

/** Rotações suaves alternadas para o marquee (efeito de colagem viva). */
const MARQUEE_ROTATIONS = [
  '-rotate-3',
  'rotate-2',
  '-rotate-1',
  'rotate-3',
  '-rotate-2',
  'rotate-1',
];

const Gallery: FC = memo(() => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const { singleBarberMode } = useBarberSettings();

  useEffect(() => {
    getGalleryImages()
      .then((data) => {
        if (data) setImages(data as GalleryImage[]);
      })
      .catch((e) => logError(e));
    // Nº de barbeiros ativos define o formato: marquee (2+) ou colagem (1).
    getBarbers()
      .then((data) => {
        if (data) setBarbers(data || []);
      })
      .catch((e) => logError(e, 'Gallery/getBarbers'));
  }, []);

  const displayBarbers = barbers.filter((b) => b.is_active && !!b.phone);
  // "Modo barbeiro único" (config) mantém a colagem mesmo com 2+ linhas.
  const marqueeMode = !singleBarberMode && displayBarbers.length >= 2;

  // Filtrar imagens por barbeiro selecionado
  const filteredImages =
    activeFilter === 'all' ? images : images.filter((img) => img.barber_id === activeFilter);

  // Marquee: usa TODAS as fotos filtradas (pula as 2 do Hero). Colagem: mostra as 3 seguintes.
  const marqueeItems = filteredImages.slice(2).map((img, idx) => ({
    url: img.image_url,
    alt: img.alt || 'Foto de corte',
    rotate: MARQUEE_ROTATIONS[idx % MARQUEE_ROTATIONS.length] ?? '-rotate-1',
  }));
  const useMarquee = marqueeMode && marqueeItems.length >= 3;

  const galleryImages = filteredImages.slice(2, 5);
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

  const marqueeStyle = {
    '--marquee-duration': `${Math.max(36, marqueeItems.length * 6)}s`,
  } as CSSProperties;

  const hasBarberFilter = displayBarbers.length >= 2;

  return (
    <section
      id="galeria"
      className="py-24 md:py-32 bg-dark-surface border-t border-white/[0.06] text-white relative overflow-x-clip"
    >
      <div className="container mx-auto px-6 max-w-6xl text-center">
        {/* Header */}
        <div className="mb-8 md:mb-12 space-y-2">
          <span className="text-[11px] font-sans font-bold uppercase tracking-[0.35em] text-zinc-400 block">
            Galeria
          </span>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-bold uppercase tracking-tight font-sans">
            <span>{useMarquee ? 'Nossos' : 'Meus'}</span>{' '}
            <span className="font-serif italic font-normal text-white lowercase">trabalhos</span>
          </h2>
          {useMarquee && !hasBarberFilter && (
            <p className="hidden sm:block text-zinc-500 font-sans text-[11px] sm:text-xs font-light tracking-[0.15em] uppercase max-w-md mx-auto">
              Passe o mouse sobre as fotos para pausar
            </p>
          )}
        </div>

        {/* ── Abas de filtro por barbeiro ── */}
        {hasBarberFilter && (
          <div className="flex items-center justify-center gap-1 mb-10 md:mb-14 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit mx-auto">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Todos
            </button>
            {displayBarbers.map((barber) => (
              <button
                key={barber.id}
                type="button"
                onClick={() => setActiveFilter(barber.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeFilter === barber.id
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {barber.name}
              </button>
            ))}
          </div>
        )}

        {useMarquee ? (
          /* ── MARQUEE: todas as fotos em loop (2+ barbeiros) ── */
          <div
            className="marquee-container relative overflow-x-clip max-w-full py-6"
            role="group"
            aria-label="Galeria de trabalhos"
            tabIndex={0}
          >
            <div
              className="marquee-track flex items-center gap-5 sm:gap-8 w-max px-4"
              style={marqueeStyle}
            >
              {[...marqueeItems, ...marqueeItems].map((item, i) => (
                <div
                  key={i}
                  aria-hidden={i >= marqueeItems.length}
                  className={`relative shrink-0 w-[170px] sm:w-[240px] md:w-[280px] bg-white p-2 sm:p-3 pt-3 sm:pt-4 pb-5 sm:pb-8 shadow-[0_15px_30px_rgba(0,0,0,0.7)] ${item.rotate}`}
                >
                  {/* Adhesive tape effect at top center */}
                  <div className="tape-effect !w-[60px] sm:!w-[80px] !h-[18px] sm:!h-[24px] !-top-2.5" />

                  {/* Photo Frame */}
                  <div className="aspect-[4/5] bg-zinc-900 overflow-hidden relative border border-zinc-200 shadow-inner">
                    <img
                      src={item.url}
                      alt={item.alt}
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 640px) 170px, (max-width: 768px) 240px, 280px"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Edge fades — as fotos "desaparecem" nas bordas */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-dark-surface to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-dark-surface to-transparent z-10" />
          </div>
        ) : (
          /* ── COLAGEM: 3 polaroids (barbeiro único) ── */
          <div className="flex flex-row items-center justify-center gap-0 max-w-5xl mx-auto py-6 px-4 sm:px-6 md:px-8">
            {displayItems.map((item, index) => (
              <div
                key={index}
                className={`shrink-0 relative w-[110px] sm:w-[240px] md:w-[310px] bg-white p-2 sm:p-3.5 pt-3 sm:pt-4 pb-5 sm:pb-8 shadow-[0_15px_30px_rgba(0,0,0,0.7)] ${item.transform} ${
                  index === 0
                    ? '-mr-2 sm:-mr-12 md:-mr-16'
                    : index === 2
                      ? '-ml-2 sm:-ml-12 md:-ml-16'
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
                      decoding="async"
                      sizes="(max-width: 640px) 110px, (max-width: 768px) 240px, 310px"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-600">
                      <ImageIcon size={28} className="sm:size-10" />
                      <span className="text-[10px] sm:text-[10px] font-sans font-medium uppercase tracking-wider">
                        Adicione fotos
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

export default Gallery;
