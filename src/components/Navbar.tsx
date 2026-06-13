import React, { useState, useEffect } from 'react';
import { Scissors, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-700 ${isScrolled ? 'bg-black/90 backdrop-blur-md py-3 shadow-[0_10px_30px_-10px_rgba(197,160,89,0.1)]' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center space-x-3 group cursor-pointer" 
          onClick={() => navigate('/')}
        >
          <div className="relative w-12 h-12 flex items-center justify-center">
             <img 
               src="/assets/logo.webp" 
               alt="Black Diamond" 
               className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" 
               onError={(e) => {
                 e.currentTarget.style.display = 'none';
                 const fallback = document.getElementById('nav-fallback-icon');
                 if (fallback) fallback.style.display = 'block';
               }} 
             />
             <Scissors className="text-gold-600 w-8 h-8 group-hover:rotate-12 transition-transform duration-500" style={{ display: 'none' }} id="nav-fallback-icon" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-serif font-bold tracking-[0.2em] text-white leading-none uppercase">BLACK DIAMOND</span>
            <span className="text-[10px] tracking-[0.4em] text-gold-600 uppercase font-light">Barbearia Premium</span>
          </div>
        </motion.div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-10">
          {[
            { label: 'Início', id: 'home' },
            { label: 'Serviços', id: 'servicos' },
            { label: 'Sobre', id: 'sobre' },
            { label: 'Localização', id: 'localização' }
          ].map((item, idx) => (
            <motion.button 
              key={item.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * idx }}
              onClick={() => handleNavClick(item.id)}
              className="text-[11px] uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors duration-500 font-medium relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold-600 transition-all duration-500 group-hover:w-full"></span>
            </motion.button>
          ))}
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            onClick={() => navigate('/agendar')}
            className="group relative border border-[#C5A059] px-8 py-2.5 rounded-sm transition-all duration-700 hover:bg-[#C5A059] overflow-hidden"
          >
            <span className="relative z-10 text-[#C5A059] group-hover:text-black font-bold text-[11px] uppercase tracking-widest transition-colors duration-500">Agendar Agora</span>
          </motion.button>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="md:hidden bg-black/95 backdrop-blur-xl absolute top-full left-0 w-full p-10 flex flex-col space-y-8 border-t border-white/5 shadow-2xl overflow-hidden"
          >
            {['home', 'servicos', 'sobre', 'localização'].map((id, idx) => (
              <motion.button 
                key={id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                onClick={() => handleNavClick(id)} 
                className="text-sm uppercase tracking-[0.3em] text-gray-400 text-left hover:text-white transition-colors duration-300"
              >
                {id === 'localização' ? 'Localização' : id.charAt(0).toUpperCase() + id.slice(1)}
              </motion.button>
            ))}
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => { navigate('/agendar'); setIsMobileMenuOpen(false); }}
              className="border border-gold-600 text-gold-600 font-bold px-6 py-4 rounded-sm text-xs uppercase tracking-[0.3em] text-center active:bg-gold-600 active:text-black transition-colors"
            >
              Agendar Agora
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
