import React from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

const About: React.FC = () => {
  return (
    <section id="sobre" className="py-32 md:py-48 bg-[#09090B] text-white overflow-hidden relative border-t border-white/5">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-600 opacity-[0.02] rounded-full blur-[150px] -mr-80 -mt-80 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-24 lg:gap-40">
          {/* Image Column */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full md:w-5/12 group"
          >
            <div className="relative">
              {/* Premium Frame */}
              <div className="absolute -inset-4 border border-gold-600/10 translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-1000" />
              
              <div className="aspect-[3/4] bg-zinc-900 border border-white/5 relative overflow-hidden flex items-center justify-center">
                {/* Professional Placeholder with Camera Icon */}
                <div className="flex flex-col items-center space-y-4 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
                  <Camera size={48} strokeWidth={1} className="text-zinc-400" />
                  <span className="text-[10px] font-bold tracking-[0.4em] uppercase">Preview</span>
                </div>
                
                {/* Subtle Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent opacity-60" />
              </div>
            </div>
          </motion.div>

          {/* Text Column */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="w-full md:w-7/12"
          >
            <div className="flex items-center space-x-4 mb-10">
              <div className="h-[1px] w-8 bg-gold-600/40"></div>
              <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.5em] uppercase">Nossa Essência</h2>
            </div>
            
            <h3 className="text-5xl md:text-[5.5rem] font-serif font-bold text-white mb-12 leading-[1.05] tracking-tight">
              PRAZER, <br />
              <span className="italic font-light text-gold-600/90">TATO.</span>
            </h3>
            
            <div className="space-y-12 max-w-2xl">
              <p className="text-gray-400 font-light text-lg md:text-xl leading-relaxed tracking-wide font-sans">
                "A Black Diamond nasceu do sonho de ser mais do que uma barbearia: um espaço de confiança. Um lugar pra você sentar, relaxar e saber que está em boas mãos."
              </p>
              
              <div className="relative py-6">
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gold-600/20" />
                <p className="text-gold-600 font-serif font-medium text-2xl md:text-4xl italic leading-snug pl-10 max-w-xl">
                  "NÃO SOU O MELHOR, <br />MAS SOU O MELHOR PARA VOCÊ."
                </p>
              </div>

              <div className="pt-12 flex flex-col items-start gap-2">
                <span className="text-white font-serif text-lg uppercase tracking-[0.4em] font-bold">Tatiano Silva</span>
                <span className="text-zinc-600 text-[10px] uppercase tracking-[0.6em] font-black">Fundador & Master Barber</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
