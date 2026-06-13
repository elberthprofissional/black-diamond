import React from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

const Gallery: React.FC = () => {
  return (
    <section id="galeria" className="py-32 md:py-48 bg-[#09090B] relative overflow-hidden font-sans">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-24 lg:mb-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <h2 className="text-gold-600 font-bold text-xs tracking-[0.6em] uppercase mb-6">Trabalhos Recentes</h2>
            <h3 className="text-5xl md:text-[6rem] font-black text-white mb-8 tracking-tighter uppercase leading-none">GALERIA</h3>
            <div className="w-12 h-[2px] bg-gold-600 mx-auto"></div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto px-4">
          {[1, 2, 3].map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
              className="group relative aspect-[4/5] overflow-hidden bg-neutral-900 border border-white/5 cursor-pointer shadow-2xl rounded-xl flex items-center justify-center"
            >
              <Camera size={40} strokeWidth={1} className="text-zinc-600" />

              {/* View Overlay - Premium Styling */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-700 bg-black/40 backdrop-blur-[1px]">
              </div>
              
              {/* Decorative corners */}
              <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-gold-600/20 group-hover:border-gold-600 transition-colors duration-700" />
              <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-gold-600/20 group-hover:border-gold-600 transition-colors duration-700" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
