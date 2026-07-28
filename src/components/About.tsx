import { useState, useEffect, useRef, type FC } from 'react';
import { User } from 'lucide-react';
import { useBarberSettings } from '../hooks/useBarberSettings';

const About: FC = () => {
  const { barberPhoto, barberBio, barberName, barberQuote } = useBarberSettings();
  const [photoError, setPhotoError] = useState(false);
  const prevPhotoRef = useRef(barberPhoto);

  useEffect(() => {
    if (prevPhotoRef.current !== barberPhoto) {
      prevPhotoRef.current = barberPhoto;
      setPhotoError(false);
    }
  }, [barberPhoto]);

  const hasPhoto = !!barberPhoto && !photoError;
  const displayPhoto = hasPhoto ? barberPhoto : '/assets/tato-portrait.jpg';
  const displayName = barberName || 'Barbeiro';
  const displayBio =
    barberBio ||
    'Acredito que a barbearia é um dos poucos lugares onde o homem pode relaxar de verdade. Por isso, busco oferecer um atendimento tranquilo, com atenção aos detalhes e respeito a cada cliente.';
  const displayQuote = barberQuote || 'Não sou o melhor, mas sou o melhor para você';

  return (
    <section id="sobre" className="py-24 md:py-32 bg-[#121212] relative overflow-hidden text-white">
      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        {/* Main Section Card */}
        <div className="bg-[#181818] border border-white/[0.08] p-6 sm:p-8 md:p-14 rounded-none shadow-2xl relative">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-center">
            {/* Barber Photo with Polaroid Frame & Tape Effect */}
            <div className="sm:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[180px] sm:max-w-[260px] md:max-w-[320px] bg-white p-2 sm:p-3 pt-2 sm:pt-3 pb-5 sm:pb-8 shadow-2xl transform -rotate-2">
                {/* Tape accent */}
                <div className="tape-effect" />

                <div className="aspect-[4/5] bg-zinc-900 overflow-hidden relative border border-zinc-200 flex items-center justify-center">
                  {hasPhoto ? (
                    <img
                      src={displayPhoto}
                      alt={`Foto de ${displayName}`}
                      className="w-full h-full object-cover object-top"
                      onError={() => setPhotoError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#181818] flex items-center justify-center">
                      <User size={48} className="lucide-user text-zinc-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Column */}
            <div className="sm:col-span-7 flex flex-col items-start space-y-4 sm:space-y-6 text-left">
              <div className="space-y-2">
                <span className="text-[11px] font-sans font-bold uppercase tracking-[0.25em] text-zinc-400">
                  Sobre Mim
                </span>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight font-sans leading-none">
                  <span>{displayName}</span>, <br />
                  <span className="font-serif italic font-normal lowercase tracking-normal text-zinc-300">
                    seu barbeiro
                  </span>
                </h2>
              </div>

              <p className="text-zinc-300 font-sans text-sm sm:text-base font-light leading-relaxed">
                {displayBio}
              </p>

              {displayQuote && (
                <blockquote className="border-l-2 border-[#D4AF37]/40 pl-4 py-1 text-sm font-serif italic text-[#D4AF37]">
                  &ldquo;{displayQuote}&rdquo;
                </blockquote>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
