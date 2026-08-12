import { useState, useEffect, memo, type FC } from 'react';
import { useNavigate } from 'react-router';
import { User } from 'lucide-react';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { getClientSession } from '../lib/clientSession';

const Navbar: FC = memo(() => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  // Cliente logado? (sessão local de 7 dias) — reage a login/logout na mesma aba.
  const [hasSession, setHasSession] = useState(() => !!getClientSession());
  const { brandName, brandColor, brandLogo } = useBarberSettings();
  const displayName = brandName || 'BLACK DIAMOND';

  useEffect(() => {
    const sync = () => setHasSession(!!getClientSession());
    window.addEventListener('client-session-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('client-session-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Save scroll pos on mount to avoid flash
  useEffect(() => {
    setScrolled(window.scrollY > 40);
  }, []);

  const handleNavClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const navLinks = [
    { label: 'SOBRE MIM', id: 'sobre' },
    { label: 'SERVIÇOS', id: 'servicos' },
    { label: 'GALERIA', id: 'galeria' },
    { label: 'ONDE ESTAMOS', id: 'localizacao' },
  ];

  const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(brandColor);
  const accent = isValidColor ? brandColor : '#d4af37';

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-[background,backdrop-filter,height] duration-500 overflow-hidden ${
        scrolled
          ? 'bg-black/70 backdrop-blur-xl h-16 md:h-20 border-b border-white/[0.04]'
          : 'bg-gradient-to-b from-black/40 to-transparent h-20 md:h-28'
      }`}
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div className="container mx-auto h-full px-4 md:px-8 flex justify-between items-center max-w-[1600px] gap-4">
        {/* Logo */}
        <button
          className="flex items-center cursor-pointer bg-transparent border-none p-0 group transition-opacity duration-300 hover:opacity-80"
          onClick={() => navigate('/')}
          aria-label={`Página Inicial - ${displayName}`}
          type="button"
        >
          <img
            src={brandLogo || '/assets/logo.webp'}
            alt={displayName}
            width={120}
            height={120}
            loading="lazy"
            decoding="async"
            className={`transition-[width,height] duration-500 object-contain ${
              scrolled ? 'w-16 h-16 md:w-20 md:h-20' : 'w-20 h-20 md:w-32 md:h-32'
            }`}
          />
        </button>

        {/* Desktop Links */}
        <nav className="hidden lg:flex items-center gap-8 xl:gap-10" aria-label="Menu de navegação">
          {navLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-label={`Ir para a seção ${item.label}`}
              className="nav-underline text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-sans transition-colors duration-300 cursor-pointer hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Actions — bloco coeso à direita (conta + agendar) em todos os tamanhos */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Minha Conta / Entrar — no celular: ícone; no resto: ícone + texto */}
          <button
            onClick={() => navigate(hasSession ? '/cliente' : '/entrar')}
            aria-label={hasSession ? 'Minha conta do cliente' : 'Entrar na minha conta'}
            className="group flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 md:py-3 rounded-full text-[11px] sm:text-[12px] font-sans uppercase tracking-[0.18em] font-bold text-zinc-300 border border-white/[0.1] transition-all duration-300 cursor-pointer hover:text-white hover:border-gold/40 hover:bg-white/[0.04] hover:-translate-y-0.5 gap-2"
          >
            <User size={15} className="transition-colors duration-300 group-hover:text-gold" />
            <span className="hidden sm:inline">{hasSession ? 'Minha Conta' : 'Entrar'}</span>
          </button>

          {/* CTA — vai direto ao formulário (a tela de entrada foi removida) */}
          <button
            onClick={() => navigate('/agendar')}
            aria-label="Agendar um horário"
            className="px-5 sm:px-7 py-2.5 md:py-3 rounded-full text-[11px] sm:text-[12px] font-sans uppercase tracking-[0.18em] font-bold text-black transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-gold/20 hover:-translate-y-0.5"
            style={{ backgroundColor: accent }}
          >
            Agendar
          </button>
        </div>
      </div>
    </nav>
  );
});

export default Navbar;
