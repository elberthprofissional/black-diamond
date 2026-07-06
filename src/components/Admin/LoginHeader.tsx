import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LoginHeaderProps {
  isPWA: boolean;
}

export default function LoginHeader({ isPWA }: LoginHeaderProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Voltar para Home (apenas no site, oculto no PWA) */}
      {!isPWA && (
        <button
          onClick={() => navigate('/')}
          className="fixed top-6 left-6 z-50 text-zinc-500 hover:text-white transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      {/* Mobile Logo */}
      <div className="lg:hidden flex flex-col items-center mb-6">
        <img src="/assets/logo.webp" alt="Logo" className="w-28 h-28" />
      </div>

      {/* Header Desktop */}
      <div className="hidden lg:block mb-16 space-y-4 w-full text-left">
        <h1 className="text-5xl font-bebas tracking-widest text-white">BEM-VINDO</h1>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">
          Insira seus dados para continuar
        </p>
      </div>
    </>
  );
}
