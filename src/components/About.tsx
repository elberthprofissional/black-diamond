import React from 'react';
import { useBarberSettings } from '../contexts/BarberSettingsContext';

const About: React.FC = () => {
  const { barberName, barberPhoto, barberBio } = useBarberSettings();

  const displayName = barberName || 'TATO';
  const displayPhoto = barberPhoto || '/assets/tato.webp';
  const displayBio = barberBio || 'Acredito que a barbearia é um dos poucos lugares onde o homem pode relaxar de verdade. Por isso, busco oferecer um atendimento tranquilo, com atenção aos detalhes e respeito a cada cliente.';

  return (
    <section id="sobre" className="py-24 md:py-64 bg-[#141414] overflow-hidden border-y border-white/[0.02]">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">

          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-[100px]">

            {/* Editorial Text */}
            <div className="w-full lg:w-[520px] lg:shrink-0 space-y-10 text-center lg:text-left order-2 lg:order-first">
              <div className="space-y-4">
                <h3 className="text-[10px] font-bebas text-[#D4AF37] tracking-[0.6em] uppercase">Sobre Mim</h3>
                <h2 className="text-4xl sm:text-6xl md:text-8xl font-bebas text-white leading-tight uppercase tracking-widest">
                  PRAZER, <br />
                  <span className="font-serif italic font-light">{displayName}.</span>
                </h2>
              </div>

              {/* Barber Photo - Mobile */}
              <div className="w-full lg:hidden relative pl-8">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/[0.05] shadow-2xl max-w-[280px] ml-auto">
                  <img src={displayPhoto} alt={`${displayName} - Barbeiro`} className="w-full h-full object-cover object-top" loading="lazy" />
                </div>
              </div>

              <div className="space-y-10 max-w-lg mx-auto lg:mx-0">
                <p className="text-zinc-400 font-roboto font-light text-base md:text-2xl leading-relaxed">
                  {displayBio}
                </p>

                <div className="pt-8 border-t border-white/[0.05]">
                  <p className="text-lg md:text-3xl font-serif italic text-[#D4AF37] leading-relaxed">
                    "Não sou o melhor, mas sou o melhor para você."
                  </p>
                </div>
              </div>
            </div>

            {/* Barber Photo - Desktop */}
            <div className="hidden lg:block w-full lg:flex-1 relative lg:ml-auto">
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/[0.05] shadow-2xl">
                <img src={displayPhoto} alt={`${displayName} - Barbeiro`} className="w-full h-full object-cover object-top" loading="lazy" />
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
