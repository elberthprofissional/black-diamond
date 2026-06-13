import React, { useState, useEffect } from 'react';
import { Scissors, Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenBooking: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onOpenBooking }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-black/95 backdrop-blur-md py-3 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.1)]' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <div className="relative w-12 h-12 flex items-center justify-center">
             <img 
               src="/assets/logo.webp" 
               alt="Black Diamond" 
               className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" 
               onError={(e) => {
                 e.currentTarget.style.display = 'none';
                 const fallback = document.getElementById('nav-fallback-icon');
                 if (fallback) fallback.style.display = 'block';
               }} 
             />
             <Scissors className="text-gold-600 w-8 h-8 group-hover:rotate-12 transition-transform" style={{ display: 'none' }} id="nav-fallback-icon" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-serif font-bold tracking-[0.2em] text-white leading-none">BLACK DIAMOND</span>
            <span className="text-[10px] tracking-[0.4em] text-gold-600 uppercase font-light">Barbearia Premium</span>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-10">
          {['Início', 'Serviços', 'Sobre', 'Contato'].map((item) => (
            <a 
              key={item}
              href={`#${item.toLowerCase()}`} 
              className="text-[11px] uppercase tracking-[0.2em] text-gray-400 hover:text-gold-600 transition-colors duration-300 font-medium relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}
          <button 
            onClick={onOpenBooking}
            className="group relative border border-gold-600 px-8 py-2.5 rounded-sm transition-all duration-500 hover:bg-gold-600"
          >
            <span className="relative z-10 text-gold-600 group-hover:text-black font-bold text-[11px] uppercase tracking-widest transition-colors duration-500">Agendar Agora</span>
          </button>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="text-white" /> : <Menu className="text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-dark-card absolute top-full left-0 w-full p-6 flex flex-col space-y-4 border-t border-dark-border">
          <a href="#home" className="text-sm uppercase tracking-widest" onClick={() => setIsMobileMenuOpen(false)}>Início</a>
          <a href="#servicos" className="text-sm uppercase tracking-widest" onClick={() => setIsMobileMenuOpen(false)}>Serviços</a>
          <a href="#sobre" className="text-sm uppercase tracking-widest" onClick={() => setIsMobileMenuOpen(false)}>Sobre</a>
          <a href="#contato" className="text-sm uppercase tracking-widest" onClick={() => setIsMobileMenuOpen(false)}>Contato</a>
          <button 
            onClick={() => {
              onOpenBooking();
              setIsMobileMenuOpen(false);
            }}
            className="bg-gold-gradient text-black font-bold px-6 py-3 rounded-sm text-sm uppercase tracking-widest"
          >
            Agendar Agora
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
