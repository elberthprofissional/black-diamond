import React from 'react';
import { motion } from 'framer-motion';

interface HeroProps {
  onOpenBooking: () => void;
}

const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image Placeholder with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0" 
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          filter: 'brightness(0.3)'
        }}
      />
      
      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-gold-600 font-serif italic text-xl md:text-2xl mb-4">Bem-vindo à Experiência</h2>
          <h1 className="text-5xl md:text-8xl font-serif font-bold text-white mb-6 tracking-tight">
            BLACK <span className="text-gold-gradient">DIAMOND</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light tracking-wide">
            Onde a tradição encontra o luxo. Elevando o padrão da barbearia moderna para o homem que não aceita nada menos que a perfeição.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <button 
              onClick={onOpenBooking}
              className="w-full md:w-auto bg-gold-gradient text-black font-bold px-10 py-4 rounded-sm text-sm uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Agendar Horário
            </button>
            <a 
              href="#servicos"
              className="w-full md:w-auto border border-gold-600 text-gold-600 font-bold px-10 py-4 rounded-sm text-sm uppercase tracking-widest hover:bg-gold-600 hover:text-black transition-all flex items-center justify-center"
            >
              Nossos Serviços
            </a>
          </div>
        </motion.div>
      </div>

      {/* Decorative element */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-[1px] h-20 bg-gradient-to-b from-gold-600 to-transparent"></div>
      </div>
    </section>
  );
};

export default Hero;
