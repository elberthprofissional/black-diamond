import React from 'react';
import { motion } from 'framer-motion';

interface HeroProps {
  onOpenBooking: () => void;
}

const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Background Image with Sagrada-style clean overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 opacity-40 animate-slow-zoom" 
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80")',
        }}
      />
      
      {/* Light Gradient for a cleaner feel */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-[1]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <h2 className="text-gold-600 font-sans font-semibold text-sm md:text-base tracking-[0.5em] uppercase mb-6">
              O seu momento, a sua marca
            </h2>

            <h1 className="text-6xl md:text-9xl font-serif font-bold text-white mb-8 tracking-tight leading-[0.9]">
              BLACK <br />
              <span className="text-gold-600 italic">DIAMOND</span>
            </h1>
            
            <p className="text-gray-300 text-base md:text-xl max-w-xl mb-12 font-light tracking-wide leading-relaxed">
              Muito mais que uma barbearia. Um refúgio de sofisticação e estilo para o homem que busca a sua melhor versão.
            </p>
            
            <div className="flex flex-col md:flex-row items-start gap-8">
              <button 
                onClick={onOpenBooking}
                className="group relative px-12 py-5 bg-gold-600 text-black font-bold text-xs uppercase tracking-[0.3em] overflow-hidden transition-all duration-500 hover:pr-16"
              >
                <span className="relative z-10">Agendar agora</span>
                <span className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500">→</span>
              </button>
              
              <div className="flex items-center space-x-6">
                <div className="h-[1px] w-12 bg-gray-700"></div>
                <span className="text-gray-500 text-[10px] uppercase tracking-[0.4em] font-bold">Desde 2026</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Side Decorative Text */}
      <div className="absolute right-10 bottom-24 z-10 hidden lg:block vertical-text">
        <span className="text-gray-800 text-sm tracking-[1em] uppercase font-bold rotate-90 origin-right">
          Premium Barber Shop
        </span>
      </div>
    </section>
  );
};

export default Hero;
