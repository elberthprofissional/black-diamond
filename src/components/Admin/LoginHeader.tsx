import { useNavigate } from 'react-router-dom';
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
          className="fixed top-6 left-6 z-50 text-white hover:text-[#D4AF37] transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      {/* Mobile Logo */}
      <div className="lg:hidden flex flex-col items-center mb-6">
        {brandLogo ? (
          <img src={brandLogo} alt="Logo" className="w-28 h-28 object-contain" />
        ) : (
          <img src="/assets/logo.webp" alt="Logo" className="w-28 h-28" />
        )}
      </div>

      {/* Header Desktop */}
      <div className="hidden lg:block mb-16 space-y-4 w-full text-left">
        <h1 className="text-4xl lg:text-5xl font-bebas tracking-[0.05em] text-white leading-none">
          Bem-vindo
        </h1>
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">
          Insira seus dados para continuar
        </p>
      </div>
    </>
  );
}
