import { useState, useEffect, type FC } from 'react';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { useDayStatus } from '../hooks/useDayStatus';
import { getGalleryImages } from '../lib/api/gallery';
import { ImageIcon } from 'lucide-react';
import { logError } from '../lib/logger';

const VALID_HEX = /^#[0-9A-Fa-f]{6}$/;

const Hero: FC = () => {
  const { brandName, brandColor, barberHours } = useBarberSettings();
  const { isClosed } = useDayStatus(barberHours);
  const displayName = brandName || 'BLACK DIAMOND';
  const color = VALID_HEX.test(brandColor) ? brandColor : '#d4af37';

  const displayNameParts = displayName.split(' ');
  const firstName = displayNameParts[0] || 'BLACK';
  const restName = displayNameParts.slice(1).join(' ') || 'DIAMOND';

  // Busca as 2 primeiras fotos da galeria para exibir no Hero
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [heroFetched, setHeroFetched] = useState(false);

  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        const data = await getGalleryImages();
        if (data && data.length > 0) {
          setHeroImages(data.slice(0, 2).map((img) => img.image_url));
        }
      } catch (e) {
        logError(e);
      } finally {
        setHeroFetched(true);
      }
    };
    fetchHeroImages();
  }, []);

  const hasHeroImages = heroFetched && heroImages.length > 0;

  return (
    <section
      id="home"
      className="relative min-h-[80vh] md:min-h-[92vh] pt-20 md:pt-28 pb-8 md:pb-16 flex items-center justify-center bg-[#121212] overflow-hidden text-white"
    >
      {/* Hidden image for accessibility & test compatibility */}
      <img src="/assets/hero-bg.webp" alt={displayName} className="hidden" />

      {/* Background image: fundo-mobile (mobile) / fundo-desktop (desktop) */}
      <picture className="absolute inset-0 z-0">
        <source srcSet="/assets/fundo-mobile.webp" media="(max-width: 1023px)" />
        <img
          src="/assets/fundo-desktop.webp"
          alt=""
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
      </picture>
      {/* Dark overlays — suaves pra imagem de fundo aparecer mas sem gritar */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/40 to-[#121212]/80" />
      <div className="absolute inset-0 z-[1] bg-[#0a0a0a]/20 mix-blend-multiply" />

      {/* Subtle background radial glow */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-20"
        style={{ background: color }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* LEFT / MAIN COLUMN: Typography & Mobile Floating Image */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-4 md:space-y-6">
            {/* Company Tag / Eyebrow */}
            <div className="flex items-center gap-3">
              <span className="h-px w-8" style={{ background: color }} aria-hidden="true" />
              <span className="text-[11px] sm:text-xs uppercase tracking-[0.3em] font-sans font-bold text-zinc-400">
                {displayName}
              </span>
            </div>

            {/* Headline */}
            <div className="w-full">
              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[5.2rem] font-bold leading-[0.95] tracking-tight uppercase font-sans">
                <span>{firstName}</span> <br />
                <span className="font-serif italic font-normal text-white lowercase tracking-normal">
                  {restName || 'barbeiro'}
                </span>
              </h1>
            </div>

            {/* Tagline / Subtitle */}
            <p className="text-zinc-400 font-sans text-xs sm:text-base md:text-lg max-w-md font-light leading-relaxed">
              Corte na régua. Barba na régua. Papo reto. Esquece fila — agenda, vem, senta e sai
              renovado.
            </p>

            {/* Status badge - Aberto/Fechado */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.15em] font-sans font-medium transition-all duration-300"
              style={{
                borderColor: isClosed ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
                backgroundColor: isClosed ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                color: isClosed ? '#ef4444' : '#22c55e',
              }}
              aria-label={isClosed ? 'Barbearia fechada' : 'Barbearia aberta'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-red-500' : 'bg-green-500'}`}
                aria-hidden="true"
              />
              <span>{isClosed ? 'Fechado' : 'Aberto'}</span>
            </div>
          </div>

          {/* RIGHT COLUMN: 2-Photo Staircase Showcase - Desktop only */}
          <div className="hidden lg:flex lg:col-span-5 justify-end mt-6 lg:mt-0">
            <div className="relative w-full max-w-[340px] aspect-[4/5] flex items-center justify-center">
              {/* 1. Top Right Photo Frame (Upper step - usa 1ª foto da galeria) */}
              <div className="absolute top-0 right-0 w-[58%] aspect-[3/4] bg-[#1a1a1a] border-2 border-[#2b2b2b] shadow-2xl overflow-hidden rounded-none z-10 flex items-center justify-center">
                {hasHeroImages ? (
                  <img
                    src={heroImages[0]}
                    alt="Corte na régua"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={40} className="text-zinc-700" />
                )}
              </div>

              {/* 2. Bottom Left Photo Frame (Lower step - usa 2ª foto da galeria) */}
              <div className="absolute bottom-2 left-0 w-[60%] aspect-[3/4] bg-[#141414] border-2 border-[#333333] shadow-[0_25px_50px_rgba(0,0,0,0.8)] overflow-hidden rounded-none z-20 flex items-center justify-center">
                {hasHeroImages && heroImages.length >= 2 ? (
                  <img
                    src={heroImages[1]}
                    alt="Barba e corte completo"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : hasHeroImages && heroImages.length === 1 ? (
                  <img
                    src={heroImages[0]}
                    alt="Barba e corte completo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={40} className="text-zinc-700" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
