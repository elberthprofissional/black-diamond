import { useState, useEffect, useRef, type FC } from 'react';
import { User } from 'lucide-react';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { getBarbers } from '../lib/api/barbers';
import type { Barber } from '../types';
import { logError } from '../lib/logger';

const FALLBACK_BIO =
  'Acredito que a barbearia é um dos poucos lugares onde o homem pode relaxar de verdade. Por isso, busco oferecer um atendimento tranquilo, com atenção aos detalhes e respeito a cada cliente.';

interface BarberCardProps {
  barber: Barber;
  index: number;
}

/** Card de um barbeiro: foto polaroid com efeito de fita adesiva + nome + bio + frase. */
const BarberCard: FC<BarberCardProps> = ({ barber, index }) => {
  const [photoError, setPhotoError] = useState(false);
  const hasPhoto = !!barber.photo_url && !photoError;
  const name = barber.name || 'Barbeiro';
  // Bio opcional: exibe apenas quando preenchida (o formulário de barbeiros
  // não tem mais o campo; texto genérico repetido ficaria feio com vários barbeiros).
  const bio = barber.bio || '';
  const quote = barber.quote || '';

  return (
    <article
      className={`bg-[#181818] border border-white/[0.08] p-6 sm:p-8 rounded-none shadow-2xl flex flex-col ${
        index % 2 === 1 ? 'lg:translate-y-8' : ''
      }`}
    >
      {/* Polaroid com efeito de fita */}
      <div className="relative w-full max-w-[220px] mx-auto bg-white p-2 sm:p-3 pt-2 sm:pt-3 pb-5 sm:pb-8 shadow-2xl -rotate-2">
        <div className="tape-effect" />
        <div className="aspect-[4/5] bg-zinc-900 overflow-hidden relative border border-zinc-200 flex items-center justify-center">
          {hasPhoto ? (
            <img
              src={barber.photo_url}
              alt={`Foto de ${name}`}
              loading="lazy"
              decoding="async"
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

      <div className="mt-8 text-center space-y-4">
        <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight font-sans leading-none text-white">
          {name}
        </h3>
        <p className="font-serif italic font-normal lowercase tracking-normal text-zinc-400 text-sm">
          seu barbeiro
        </p>
        {bio && <p className="text-zinc-300 font-sans text-sm font-light leading-relaxed">{bio}</p>}
        {quote && (
          <blockquote className="border-l-2 border-gold/40 pl-4 py-1 text-sm font-serif italic text-gold text-left">
            &ldquo;{quote}&rdquo;
          </blockquote>
        )}
      </div>
    </article>
  );
};

/** Seção Sobre Mim — exibe todos os barbeiros ativos (multi-barbeiro). */
const About: FC = () => {
  const { barberPhoto, barberBio, barberName, barberQuote } = useBarberSettings();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [photoError, setPhotoError] = useState(false);
  const prevPhotoRef = useRef(barberPhoto);

  useEffect(() => {
    let active = true;
    getBarbers()
      .then((data) => {
        if (active) setBarbers(data || []);
      })
      .catch((e) => {
        logError(e, 'About/getBarbers');
        // Sem barbeiros via RPC → fallback para perfil único via settings
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (prevPhotoRef.current !== barberPhoto) {
      prevPhotoRef.current = barberPhoto;
      setPhotoError(false);
    }
  }, [barberPhoto]);

  // Barbeiros exibidos publicamente: ativos E com WhatsApp (exclui perfil de suporte/dev)
  const displayBarbers = barbers.filter((b) => b.is_active && !!b.phone);

  // ── FALLBACK: perfil único via settings (sem barbeiros na tabela) ──
  if (displayBarbers.length === 0) {
    const hasPhoto = !!barberPhoto && !photoError;
    const displayPhoto = hasPhoto ? barberPhoto : '/assets/tato-portrait.jpg';
    const displayName = barberName || 'Barbeiro';
    const displayBio = barberBio || FALLBACK_BIO;
    const displayQuote = barberQuote;

    return (
      <section
        id="sobre"
        className="py-24 md:py-32 bg-dark-elevated relative overflow-hidden text-white"
      >
        <div className="container mx-auto px-6 max-w-5xl relative z-10">
          {/* Main Section Card */}
          <div className="bg-[#181818] border border-white/[0.08] p-6 sm:p-8 md:p-14 rounded-none shadow-2xl relative">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-center">
              {/* Barber Photo with Polaroid Frame & Tape Effect */}
              <div className="sm:col-span-5 flex justify-center">
                <div className="relative w-full max-w-[180px] sm:max-w-[260px] md:max-w-[320px] bg-white p-2 sm:p-3 pt-2 sm:pt-3 pb-5 sm:pb-8 shadow-2xl transform -rotate-2">
                  <div className="tape-effect" />
                  <div className="aspect-[4/5] bg-zinc-900 overflow-hidden relative border border-zinc-200 flex items-center justify-center">
                    {hasPhoto ? (
                      <img
                        src={displayPhoto}
                        alt={`Foto de ${displayName}`}
                        loading="lazy"
                        decoding="async"
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
                  <blockquote className="border-l-2 border-gold/40 pl-4 py-1 text-sm font-serif italic text-gold">
                    &ldquo;{displayQuote}&rdquo;
                  </blockquote>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── MULTI-BARBEIRO: grid com todos os barbeiros ativos ──
  return (
    <section
      id="sobre"
      className="py-24 md:py-32 bg-dark-elevated relative overflow-hidden text-white"
    >
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="text-center mb-12 md:mb-16 space-y-3">
          <span className="text-[11px] font-sans font-bold uppercase tracking-[0.25em] text-zinc-400">
            Sobre Nós
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight font-sans leading-none">
            Conheça nossa equipe
          </h2>
          <p className="text-zinc-400 font-sans text-sm sm:text-base font-light max-w-xl mx-auto">
            Cada corte é feito com atenção aos detalhes, no seu ritmo e do seu jeito.
          </p>
        </div>

        <div
          className={`grid grid-cols-1 gap-8 md:gap-10 ${
            displayBarbers.length > 1 ? 'md:grid-cols-2 lg:gap-12' : ''
          }`}
        >
          {displayBarbers.map((barber, index) => (
            <BarberCard key={barber.id} barber={barber} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
