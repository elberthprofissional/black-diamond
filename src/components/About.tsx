import React from 'react';
import { useBarberSettings } from '../contexts/BarberSettingsContext';

const About: React.FC = () => {
  const { barberPhoto, barberBio } = useBarberSettings();

  const displayPhoto = barberPhoto || '/assets/tato.webp';
  const displayBio =
    barberBio ||
    'Acredito que a barbearia é um dos poucos lugares onde o homem pode relaxar de verdade. Por isso, busco oferecer um atendimento tranquilo, com atenção aos detalhes e respeito a cada cliente.';

  return (
    <section
      id="sobre"
      className="py-24 md:py-64 bg-[#141414] overflow-hidden border-y border-white/[0.02]"
    >
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-10 md:gap-24">
            {/* Editorial Text */}
            <div className="w-full lg:w-1/2 space-y-8 text-center lg:text-left order-2 lg:order-first">
              <div className="space-y-3">
                <h3 className="text-xs font-bebas text-[#D4AF37] tracking-[0.5em] uppercase">
                  Sobre Mim
                </h3>
                <h2 className="text-5xl sm:text-6xl md:text-8xl font-bebas text-white leading-none uppercase tracking-widest">
                  PRAZER, <br />
                  <span className="font-serif italic font-light">Tato.</span>
                </h2>
              </div>

              {/* Barber Photo - Mobile */}
              <div className="w-full lg:hidden relative">
                <div className="relative aspect-[3/4] max-h-[350px] rounded-2xl overflow-hidden border border-white/[0.05] shadow-2xl mx-auto">
                  <img
                    src={displayPhoto}
                    alt="Black Diamond Barbearia"
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="space-y-8 max-w-lg mx-auto lg:mx-0">
                <p className="text-zinc-400 font-roboto font-light text-[15px] md:text-2xl leading-relaxed">
                  {displayBio}
                </p>

                <div className="pt-6 border-t border-white/[0.05]">
                  <p className="text-base md:text-3xl font-serif italic text-[#D4AF37] leading-relaxed">
                    "Não sou o melhor, mas sou o melhor para você."
                  </p>
                </div>
              </div>
            </div>

            {/* Barber Photo - Desktop */}
            <div className="hidden lg:block w-full lg:w-1/2 relative">
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/[0.05] shadow-2xl">
                <img
                  src={displayPhoto}
                  alt="Black Diamond Barbearia"
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-32 h-px bg-[#C5A059]/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
