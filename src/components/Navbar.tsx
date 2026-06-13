import React, { useState } from 'react';
import { Scissors, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
    <nav className={`fixed w-full z-50 transition-all duration-700 bg-black py-3 shadow-[0_10px_30px_-10px_rgba(197,160,89,0.1)]`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center space-x-2 md:space-x-3 group cursor-pointer" 
          onClick={() => navigate('/')}
        >
          <div className="relative w-8 h-8 md:w-12 md:h-12 flex items-center justify-center">
             <img 
               src="/assets/logo.webp" 
               alt="Black Diamond" 
               className="w-full h-full object-contain" 
               onError={(e) => {
                 e.currentTarget.style.display = 'none';
                 const fallback = document.getElementById('nav-fallback-icon');
                 if (fallback) fallback.style.display = 'block';
               }} 
             />
             <Scissors className="text-gold-600 w-6 h-6 md:w-8 md:h-8" style={{ display: 'none' }} id="nav-fallback-icon" />
          </div>
          <div className="flex flex-col">
            <span className="text-base md:text-2xl font-serif font-bold tracking-[0.1em] md:tracking-[0.2em] text-white leading-none uppercase">BLACK DIAMOND</span>
          </div>
        </motion.div>

        {/* Desktop Links (Hidden on Mobile) */}
        <div className="hidden md:flex items-center space-x-10">
          {[
            { label: 'Início', id: 'home' },
            { label: 'Serviços', id: 'servicos' },
            { label: 'Sobre', id: 'sobre' },
            { label: 'Localização', id: 'localização' }
          ].map((item) => (
            <motion.button 
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              onClick={() => handleNavClick(item.id)}
              className="text-[11px] uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors duration-500 font-medium relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold-600 transition-all duration-500 group-hover:w-full"></span>
            </motion.button>
          ))}
        </div>

        {/* CTA Button (Visible on all sizes) */}
        <div className="flex items-center">
          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            onClick={() => navigate('/agendar')}
            className="group relative border border-[#C5A059] px-4 md:px-8 py-2 md:py-2.5 rounded-sm transition-all duration-500 hover:bg-[#C5A059] overflow-hidden"
          >
            <span className="relative z-10 text-[#C5A059] group-hover:text-black font-bold text-[9px] md:text-[11px] uppercase tracking-widest transition-colors duration-500">Agendar Agora</span>
          </motion.button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
