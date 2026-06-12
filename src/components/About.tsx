import React from 'react';
import { motion } from 'framer-motion';

const About: React.FC = () => {
  return (
    <section id="sobre" className="py-40 bg-dark-pure text-white overflow-hidden relative">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-600 opacity-5 rounded-full blur-[150px] -mr-80 -mt-80" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-20 lg:gap-32">
          {/* Image Column */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-full md:w-5/12 group"
          >
            <div className="relative">
              {/* Premium Border/Frame */}
              <div className="absolute -inset-4 border border-gold-600/30 translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700" />
              
              <div className="aspect-[3/4] bg-dark-card relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1599351431247-f10b21ce530d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                  alt="Tato - Master Barber" 
                  className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000 scale-110 group-hover:scale-100"
                />
                
                {/* Subtle Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-pure via-transparent to-transparent opacity-60" />
              </div>

              {/* Floating Name Overlay */}
              <div className="absolute -bottom-6 left-6 bg-gold-600 text-black px-8 py-4">
                <span className="text-[10px] uppercase tracking-[0.5em] font-black">Fundador</span>
              </div>
            </div>
          </motion.div>

          {/* Text Column */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full md:w-7/12"
          >
            <div className="flex items-center space-x-4 mb-8">
              <div className="h-[1px] w-12 bg-gold-600"></div>
              <h2 className="text-gold-600 font-sans font-bold text-xs md:text-sm tracking-[0.5em] uppercase">O Legado</h2>
            </div>
            
            <h3 className="text-5xl md:text-8xl font-serif font-bold text-white mb-10 leading-[0.9]">PRAZER, <br /><span className="italic text-gold-600">TATO.</span></h3>
            
            <div className="space-y-10">
              <p className="text-gray-400 font-light text-xl leading-relaxed tracking-wide">
                "A Black Diamond nasceu do sonho de ser mais do que uma barbearia: um espaço de confiança. Um lugar pra você sentar, relaxar e saber que está em boas mãos."
              </p>
              
              <div className="relative">
                <div className="absolute -left-6 top-0 bottom-0 w-[2px] bg-gold-600/30" />
                <p className="text-gold-600 font-serif font-bold text-3xl md:text-4xl italic leading-tight pl-6">
                  "NÃO SOU O MELHOR, <br />MAS SOU O MELHOR PARA VOCÊ."
                </p>
              </div>

              <div className="pt-10 flex flex-col items-start gap-2">
                <span className="text-white font-serif font-bold text-lg uppercase tracking-[0.3em]">TATIANO SILVA</span>
                <span className="text-gray-500 text-[10px] uppercase tracking-[0.5em] font-black">FUNDADOR & MASTER BARBER</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
