import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useBarberSettings } from '../../hooks/useBarberSettings';

interface LoginHeaderProps {
  isPWA: boolean;
}

export default function LoginHeader({ isPWA }: LoginHeaderProps) {
  const navigate = useNavigate();
  const { brandLogo } = useBarberSettings();

  return (
    <>
      {/* Voltar para Home (apenas no site, oculto no PWA) */}
      {!isPWA && (
        <button
          onClick={() => navigate('/')}
          aria-label="Voltar para a página inicial"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:top-8 lg:left-8 z-50 p-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-amber-400/40 text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
      )}

      {/* Logo — compacto, dentro do card */}
      <div className="flex justify-center">
        {brandLogo ? (
          <img
            src={brandLogo}
            alt="Logo"
            className="w-20 h-20 sm:w-16 sm:h-16 lg:w-14 lg:h-14 object-contain drop-shadow-[0_0_18px_rgba(212,175,55,0.15)]"
          />
        ) : (
          <img
            src="/assets/logo.webp"
            alt="Logo"
            className="w-20 h-20 sm:w-16 sm:h-16 lg:w-14 lg:h-14 drop-shadow-[0_0_18px_rgba(212,175,55,0.15)]"
          />
        )}
      </div>
    </>
  );
}
