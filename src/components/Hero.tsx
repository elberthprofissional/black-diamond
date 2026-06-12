import React from 'react';
import { motion } from 'framer-motion';

interface HeroProps {
  onOpenBooking: () => void;
}

const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background Image with optimized overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 scale-105 animate-slow-zoom" 
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          filter: 'brightness(0.25) contrast(1.1)'
        }}
      />
      
      {/* Gradient Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black z-[1]" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="h-[1px] w-8 md:w-12 bg-gold-600"></div>
            <h2 className="text-gold-600 font-serif italic text-sm md:text-lg tracking-[0.3em] uppercase">Estilo & Tradição</h2>
            <div className="h-[1px] w-8 md:w-12 bg-gold-600"></div>
          </div>

          <h1 className="text-7xl md:text-[12rem] font-serif font-bold text-white mb-8 tracking-tighter leading-[0.8] drop-shadow-2xl">
            BLACK <span className="text-gold-gradient block md:inline drop-shadow-[0_0_30px_rgba(212,175,55,0.3)]">DIAMOND</span>
          </h1>
          
          <p className="text-gray-400 text-sm md:text-lg max-w-2xl mx-auto mb-12 font-light tracking-[0.1em] leading-relaxed uppercase">
            A excelência da barbearia clássica em um ambiente exclusivo projetado para o homem moderno.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button 
              onClick={onOpenBooking}
              className="w-full md:w-auto bg-gold-600 text-black font-bold px-12 py-5 rounded-sm text-[11px] uppercase tracking-[0.2em] hover:bg-white transition-all duration-500 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] group"
            >
              <span className="group-hover:tracking-[0.3em] transition-all duration-500">Agendar Experiência</span>
            </button>
            <a 
              href="#servicos"
              className="w-full md:w-auto border border-white/20 text-white font-bold px-12 py-5 rounded-sm text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-500 backdrop-blur-sm"
            >
              Nossos Serviços
            </a>
          </div>
        </motion.div>
      </div>

      {/* Decorative vertical line */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 hidden md:block">
        <div className="w-[1px] h-32 bg-gradient-to-b from-gold-600 to-transparent"></div>
      </div>
    </section>
  );
};

export default Hero;
