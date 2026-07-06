import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onBookingClick: () => void;
}

const Navbar: React.FC<NavbarProps> = React.memo(({ onBookingClick }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
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
    { label: 'ONDE ESTAMOS', id: 'localização' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrolled ? 'bg-black/20 backdrop-blur-lg h-20' : 'bg-transparent h-24 md:h-32'
        }`}
      >
        <div className="container mx-auto h-full px-4 md:px-8 flex justify-between items-center max-w-[1920px]">
          <div
            className="flex items-center gap-2 md:gap-6 cursor-pointer group"
            onClick={() => navigate('/')}
            role="button"
            aria-label="Página Inicial - Black Diamond"
          >
            <img
              src="/assets/logo.webp"
              alt="Black Diamond"
              className={`transition-all duration-500 object-contain -ml-2 md:-ml-6 ${
                scrolled ? 'w-16 h-16 md:w-24 md:h-24' : 'w-20 h-20 md:w-36 md:h-36'
              }`}
            />
            <div className="flex items-baseline gap-1.5 md:gap-4">
              <span className="text-[18px] md:text-[28px] font-bebas font-normal tracking-[0.15em] md:tracking-[0.3em] text-white uppercase leading-none">
                BLACK
              </span>
              <span className="text-[18px] md:text-[28px] font-bebas font-normal tracking-[0.1em] md:tracking-[0.2em] text-[#C5A059] leading-none uppercase">
                DIAMOND
              </span>
            </div>
          </div>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center space-x-12" aria-label="Menu de navegação">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-label={`Ir para a seção ${item.label.toLowerCase()}`}
                className="text-[14px] uppercase tracking-[0.3em] text-zinc-400 font-bebas hover:text-[#C5A059] transition-all cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={onBookingClick}
              aria-label="Abrir formulário de agendamento online"
              className="px-6 sm:px-12 py-3 md:py-4 border border-[#C5A059]/30 rounded-full text-[12px] sm:text-[14px] md:text-[16px] font-bebas uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white hover:bg-[#C5A059] hover:text-black transition-all duration-500 cursor-pointer"
            >
              Agendar
            </button>
          </div>
        </div>
      </nav>
    </>
  );
});

export default Navbar;
