import React from 'react';
import { motion } from 'framer-motion';

interface HeroProps {
  onOpenBooking: () => void;
}

const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden bg-dark-pure">
      {/* Background Image with Cinematic Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 scale-105 animate-slow-zoom" 
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          filter: 'brightness(0.15)'
        }}
      />
      
      {/* Subtle Gradient for focus */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-[1]" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <div className="flex flex-col items-center mb-10">
            <h2 className="text-gold-600 font-sans font-medium text-xs tracking-[0.6em] uppercase mb-4">
              Estilo e Tradição
            </h2>
            <div className="h-[1px] w-12 bg-gold-600/40"></div>
          </div>

          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-10 tracking-[0.2em] leading-tight">
            BLACK <span className="italic">DIAMOND</span>
          </h1>
          
          <div className="max-w-xl mx-auto mb-12">
            <p className="text-gray-500 font-sans font-light text-xs md:text-sm tracking-[0.3em] uppercase leading-relaxed">
              Onde a tradição encontra o luxo moderno. <br />
              Excelência em cada detalhe.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-10">
            <button 
              onClick={onOpenBooking}
              className="border border-gold-600 text-gold-600 hover:bg-gold-600 hover:text-black font-bold px-12 py-5 rounded-none text-[10px] uppercase tracking-[0.4em] transition-all duration-700 group relative"
            >
              <span className="relative z-10">Agendar Horário</span>
            </button>
            
            {/* Studio Status Badge */}
            <div className="flex items-center space-x-3 opacity-60">
              <div className="relative flex h-1.5 w-1.2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-20"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-800"></span>
              </div>
              <span className="text-[9px] font-bold text-gray-500 tracking-[0.3em] uppercase">Estúdio Fechado</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative vertical line */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 opacity-30">
        <div className="w-[1px] h-24 bg-gradient-to-b from-gold-600 to-transparent"></div>
      </div>
    </section>
  );
};

export default Hero;
