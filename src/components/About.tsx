import { useState, useEffect, type FC } from 'react';
import { User } from 'lucide-react';
import { useBarberSettings } from '../hooks/useBarberSettings';

const About: FC = () => {
  const { barberPhoto, barberBio, barberName, barberQuote } = useBarberSettings();
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    setPhotoError(false);
  }, [barberPhoto]);

  const hasPhoto = !!barberPhoto && !photoError;
  const displayBio =
    barberBio ||
    'Acredito que a barbearia é um dos poucos lugares onde o homem pode relaxar de verdade. Por isso, busco oferecer um atendimento tranquilo, com atenção aos detalhes e respeito a cada cliente.';
  const displayQuote = barberQuote || 'Não sou o melhor, mas sou o melhor para você.';

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
                  <span className="font-serif italic font-light">{barberName || 'Barbeiro'}</span>
                </h2>
              </div>

              {/* Barber Photo - Mobile */}
              <div className="w-full lg:hidden relative">
                {hasPhoto ? (
                  <div className="relative aspect-[3/4] max-h-[350px] rounded-2xl overflow-hidden border border-white/[0.05] shadow-2xl mx-auto bg-[#1a1a1a]">
                    <img
                      src={barberPhoto}
                      alt="Barbeiro"
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                      onError={() => setPhotoError(true)}
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[3/4] max-h-[350px] rounded-2xl overflow-hidden border border-white/[0.05] shadow-2xl mx-auto bg-[#151515] flex items-center justify-center">
                    <div className="flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center ring-1 ring-white/[0.06]">
                        <User size={32} className="text-zinc-600" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8 max-w-lg mx-auto lg:mx-0">
                <p className="text-zinc-400 font-roboto font-light text-[15px] md:text-2xl leading-relaxed">
                  {displayBio}
                </p>

                <div className="pt-6 border-t border-white/[0.05]">
                  <p className="text-base md:text-3xl font-serif italic text-[#D4AF37] leading-relaxed">
                    "{displayQuote}"
                  </p>
                </div>
              </div>
            </div>

            {/* Barber Photo - Desktop */}
            <div className="hidden lg:block w-full lg:w-[55%] relative lg:ml-[100px]">
              {hasPhoto ? (
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/[0.05] shadow-2xl bg-[#1a1a1a]">
                  <img
                    src={barberPhoto}
                    alt="Barbeiro"
                    className="w-full h-full object-cover object-top scale-110"
                    loading="lazy"
                    onError={() => setPhotoError(true)}
                  />
                </div>
              ) : (
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/[0.05] shadow-2xl bg-[#151515] flex items-center justify-center">
                  <div className="flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-white/[0.02] flex items-center justify-center ring-1 ring-white/[0.06]">
                      <User size={48} className="text-zinc-600" />
                    </div>
                  </div>
                </div>
              )}
              <div className="absolute -bottom-8 -right-8 w-32 h-px bg-[#D4AF37]/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
