import { useState, useEffect, memo, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBarberSettings } from '../hooks/useBarberSettings';

interface NavbarProps {
  onBookingClick: () => void;
}

const Navbar: FC<NavbarProps> = memo(({ onBookingClick }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const { brandName, brandColor, brandLogo } = useBarberSettings();
  const displayName = brandName || 'BLACK DIAMOND';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
          <button
            onClick={() => navigate('/cliente')}
            className="nav-underline text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-sans transition-colors duration-300 cursor-pointer hover:text-[#D4AF37]"
          >
            Agendamentos
          </button>
        </nav>

        {/* CTA */}
        <button
          onClick={onBookingClick}
          aria-label="Agendar um horário"
          className="px-5 sm:px-7 py-2.5 md:py-3 rounded-full text-[11px] sm:text-[12px] font-sans uppercase tracking-[0.18em] font-bold text-black transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-gold/20 hover:-translate-y-0.5"
          style={{ backgroundColor: accent }}
        >
          Agendar
        </button>
      </div>
    </nav>
  );
});

export default Navbar;
