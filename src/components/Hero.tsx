import { type FC } from 'react';

interface HeroProps {
  onBookingClick: () => void;
}

const Hero: FC<HeroProps> = ({ onBookingClick }) => {
  return (
    <section
      id="home"
      className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image with Asymmetrical Overlay */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source media="(max-width: 639px)" srcSet="/assets/hero-bg-mobile.webp" />
          <img
            src="/assets/hero-bg.webp"
            alt="Black Diamond"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-center opacity-50"
          />
        </picture>
        {/* Escurece o lado esquerdo intensamente e deixa o direito mais limpo */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent" />
        {/* Suaviza o topo e a base para integrar com o site */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#0f0f0f]" />
      </div>

      <div className="container mx-auto px-6 relative z-10 h-full flex items-center">
        <div className="w-full lg:w-1/2 flex flex-col items-start text-left pt-20">
          <div className="space-y-4 md:space-y-2 mb-12">
            <h1 className="flex flex-col items-start">
              <span className="text-5xl sm:text-7xl md:text-[8rem] font-bebas tracking-[0.2em] md:tracking-[0.3em] text-white uppercase leading-none">
                BLACK
              </span>
              <span className="text-5xl sm:text-7xl md:text-[8rem] font-bebas tracking-[0.2em] md:tracking-[0.3em] text-[#D4AF37] uppercase leading-none mt-1 md:-mt-2">
                DIAMOND
              </span>
            </h1>
            <p className="text-[14px] md:text-[20px] font-sans font-light tracking-wide text-zinc-400 max-w-md mt-6 leading-relaxed">
              Excelência em cada detalhe. Um ambiente pensado para quem valoriza qualidade e
              conforto.
            </p>
          </div>

          <button onClick={onBookingClick} className="mt-4 group">
            <div className="px-8 py-3.5 border border-[#D4AF37]/60 bg-transparent group-hover:bg-[#D4AF37]/10 transition-all duration-300">
              <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.35em] text-[#D4AF37]">
                Agende seu horário
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Decorative side text - Hidden on small mobile */}
      <div className="absolute bottom-10 left-10 hidden sm:block">
        <p className="text-[7px] font-bold text-zinc-900 uppercase tracking-[0.4em] rotate-90 origin-left">
          Since 2026
        </p>
      </div>
    </section>
  );
};

export default Hero;
