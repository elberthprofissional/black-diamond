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
          filter: 'brightness(0.2)'
        }}
      />
      
      {/* Radial Gradient for focus */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-[1]" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <div className="flex flex-col items-center mb-8">
            <div className="h-[1px] w-24 bg-gold-600 mb-6"></div>
            <h2 className="text-gold-600 font-sans font-medium text-xs md:text-sm tracking-[0.6em] uppercase mb-4">
              Excelência em cada detalhe
            </h2>
            <h3 className="text-white/60 font-sans font-light text-[10px] md:text-xs tracking-[0.4em] uppercase">
              Onde a tradição encontra o luxo moderno
            </h3>
          </div>

          <h1 className="text-7xl md:text-[10rem] font-serif font-bold text-white mb-10 tracking-[-0.05em] leading-none">
            BLACK <span className="text-gold-600 block md:inline font-black">DIAMOND</span>
          </h1>
          
          <div className="flex flex-col items-center gap-8">
            <button 
              onClick={onOpenBooking}
              className="bg-gold-600 text-black font-bold px-16 py-5 rounded-none text-[11px] uppercase tracking-[0.4em] hover:bg-gold-hover transition-all duration-500 hover:shadow-[0_0_40px_rgba(212,175,55,0.3)] group overflow-hidden relative"
            >
              <span className="relative z-10">Agendar Horário</span>
              <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10"></div>
            </button>
            
            {/* Studio Status Badge */}
            <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-5 py-2 rounded-full backdrop-blur-md">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </div>
              <span className="text-[10px] font-bold text-white/80 tracking-[0.2em] uppercase">Estúdio Fechado</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative vertical line */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
        <div className="w-[1px] h-20 bg-gradient-to-b from-gold-600 to-transparent"></div>
      </div>
    </section>
  );
};

export default Hero;
