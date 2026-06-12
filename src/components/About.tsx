import React from 'react';
import { motion } from 'framer-motion';

const About: React.FC = () => {
  return (
    <section id="sobre" className="py-40 bg-dark-pure text-white overflow-hidden relative">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-600 opacity-[0.03] rounded-full blur-[150px] -mr-80 -mt-80 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-20 lg:gap-32">
          {/* Image Column */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-full md:w-5/12 group"
          >
            <div className="relative">
              {/* Premium Border/Frame */}
              <div className="absolute -inset-4 border border-gold-600/20 translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-1000" />
              
              <div className="aspect-[3/4] bg-dark-card relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1599351431247-f10b21ce530d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                  alt="Tato - Master Barber" 
                  className="w-full h-full object-cover grayscale brightness-[0.6] group-hover:grayscale-0 group-hover:brightness-90 transition-all duration-1000 scale-105 group-hover:scale-100"
                />
                
                {/* Subtle Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-pure via-transparent to-transparent opacity-80" />
              </div>
            </div>
          </motion.div>

          {/* Text Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="w-full md:w-7/12"
          >
            <div className="flex items-center space-x-4 mb-8">
              <div className="h-[1px] w-8 bg-gold-600/50"></div>
              <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.5em] uppercase">O Legado</h2>
            </div>
            
            <h3 className="text-5xl md:text-7xl font-serif font-bold text-white mb-10 leading-[1.1] tracking-tight">
              PRAZER, <br />
              <span className="italic font-light">TATO.</span>
            </h3>
            
            <div className="space-y-10">
              <p className="text-gray-500 font-light text-lg md:text-xl leading-relaxed tracking-wide max-w-2xl">
                "A Black Diamond nasceu do sonho de ser mais do que uma barbearia: um espaço de confiança. Um lugar pra você sentar, relaxar e saber que está em boas mãos."
              </p>
              
              <div className="relative py-4">
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gold-600/20" />
                <p className="text-gold-600 font-serif font-medium text-2xl md:text-3xl italic leading-snug pl-8 max-w-xl">
                  "NÃO SOU O MELHOR, <br />MAS SOU O MELHOR PARA VOCÊ."
                </p>
              </div>

              <div className="pt-12 flex flex-col items-start gap-1">
                <span className="text-white font-serif text-base uppercase tracking-[0.4em]">Tatiano Silva</span>
                <span className="text-gray-600 text-[9px] uppercase tracking-[0.6em] font-bold">Fundador & Master Barber</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
