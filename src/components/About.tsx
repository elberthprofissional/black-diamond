import React from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

const About: React.FC = () => {
  return (
    <section id="sobre" className="py-32 md:py-48 bg-[#09090B] text-white overflow-hidden relative border-t border-white/5 font-sans">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-600 opacity-[0.02] rounded-full blur-[150px] -mr-80 -mt-80 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-24 lg:gap-40">
          {/* Image Column */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-5/12 group"
          >
            <div className="relative">
              {/* Premium Frame */}
              <div className="absolute -inset-4 border border-gold-600/10 transition-transform" />
              
              <div className="aspect-[3/4] bg-neutral-900 border border-white/5 relative overflow-hidden rounded-xl flex flex-col items-center justify-center">
                <Camera size={48} strokeWidth={1} className="text-zinc-600" />
                
                {/* Subtle Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent opacity-60" />
              </div>
            </div>
          </motion.div>

          {/* Text Column */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-7/12"
          >
            <div className="flex items-center space-x-4 mb-10">
              <div className="h-[1px] w-8 bg-gold-600/40"></div>
              <h2 className="text-gold-600 font-bold text-xs tracking-[0.5em] uppercase">Nossa Essência</h2>
            </div>
            
            <h3 className="text-5xl md:text-[5.5rem] font-black text-white mb-12 leading-[1.05] tracking-tighter uppercase">
              PRAZER, <br />
              <span className="text-gold-600">TATO.</span>
            </h3>
            
            <div className="space-y-12 max-w-2xl">
              <p className="text-zinc-400 font-medium text-lg md:text-xl leading-relaxed tracking-wide">
                "A Black Diamond nasceu do sonho de ser mais do que uma barbearia: um espaço de confiança. Um lugar pra você sentar, relaxar e saber que está em boas mãos."
              </p>
              
              <div className="relative py-6">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-gold-600" />
                <p className="text-white font-black text-2xl md:text-4xl leading-tight pl-10 max-w-xl uppercase tracking-tighter">
                  "NÃO SOU O MELHOR, <br />MAS SOU O MELHOR PARA VOCÊ."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
