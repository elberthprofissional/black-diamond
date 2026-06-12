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
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-black/90 backdrop-blur-md py-4' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Scissors className="text-gold-600 w-8 h-8" />
          <span className="text-xl font-serif font-bold tracking-widest text-white">BLACK DIAMOND</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <a href="#home" className="text-sm uppercase tracking-widest hover:text-gold-600 transition-colors">Início</a>
          <a href="#servicos" className="text-sm uppercase tracking-widest hover:text-gold-600 transition-colors">Serviços</a>
          <a href="#sobre" className="text-sm uppercase tracking-widest hover:text-gold-600 transition-colors">Sobre</a>
          <a href="#contato" className="text-sm uppercase tracking-widest hover:text-gold-600 transition-colors">Contato</a>
          <button 
            onClick={onOpenBooking}
            className="bg-gold-gradient text-black font-bold px-6 py-2 rounded-sm text-sm uppercase tracking-widest hover:opacity-90 transition-all"
          >
            Agendar Agora
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
