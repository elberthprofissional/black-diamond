import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useBarberSettings } from '../../hooks/useBarberSettings';

interface LoginHeaderProps {
  isPWA: boolean;
}

/**
 * Marca de acesso — limpa e imponente:
 * logo com anel dourado + nome em duas linhas grandes
 * (primeira em branco, resto gravado em ouro).
 */
export default function LoginHeader({ isPWA }: LoginHeaderProps) {
  const navigate = useNavigate();
  const { brandLogo, brandName, barberName } = useBarberSettings();
  const displayName = brandName || barberName || 'Black Diamond';

  const words = displayName.split(' ');
  const firstName = words[0] || 'Black';
  const restName = words.slice(1).join(' ') || 'Diamond';

  return (
    <>
      {/* Botão de retorno — mobile */}
      {!isPWA && (
        <button
          onClick={() => navigate('/')}
          aria-label="Voltar para a página inicial"
          className="absolute top-4 left-4 z-20 text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
      )}

      {/* Marca */}
      <div
        className="flex flex-col items-center text-center mb-9 cursor-pointer"
        onClick={() => navigate('/')}
        role="button"
        tabIndex={0}
      >
        <div className="relative mb-7">
          {/* Halo dourado sutil */}
          <div className="absolute inset-[-30px] rounded-full bg-gold/10 blur-3xl" aria-hidden />
          {/* Anéis duplos contra-rotativos */}
          <div className="logo-ring" aria-hidden />
          <div className="logo-ring-outer" aria-hidden />
          <div className="w-24 h-24 rounded-2xl bg-black/60 border border-gold/20 p-2 flex items-center justify-center overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={displayName}
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <img
                src="/assets/logo.webp"
                alt={displayName}
                className="w-full h-full object-cover rounded-xl"
              />
            )}
          </div>
        </div>

        <h2 className="text-[44px] leading-none font-black text-white tracking-[0.14em] uppercase drop-shadow-lg">
          {firstName}
        </h2>
        <h2 className="gold-engraved font-cinzel tracking-[0.14em] uppercase text-[44px] font-bold leading-none mt-2">
          {restName}
        </h2>

        <div className="mt-6 ornament-divider" aria-hidden>
          <span className="ornament-divider__line" />
          <span className="ornament-divider__gem" />
          <span className="ornament-divider__line ornament-divider__line--r" />
        </div>
      </div>
    </>
  );
}
