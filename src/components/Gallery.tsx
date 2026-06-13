import React from 'react';
import { motion } from 'framer-motion';

const Gallery: React.FC = () => {
  // Realistic placeholder images focused on premium barbering
  const images = [
    "https://images.unsplash.com/photo-1593702295094-ada7444229ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  ];

  return (
    <section id="galeria" className="py-32 md:py-48 bg-[#09090B] relative overflow-hidden font-sans">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-24 lg:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <h2 className="text-gold-600 font-bold text-xs tracking-[0.6em] uppercase mb-6">Trabalhos Recentes</h2>
            <h3 className="text-5xl md:text-[6rem] font-black text-white mb-8 tracking-tighter uppercase leading-none">GALERIA</h3>
            <div className="w-12 h-[2px] bg-gold-600 mx-auto"></div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto px-4">
          {images.map((img, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: index * 0.2, ease: "easeOut" }}
              viewport={{ once: true, margin: "-100px" }}
              className="group relative aspect-[4/5] overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer shadow-2xl rounded-xl"
            >
              <div className="w-full h-full overflow-hidden">
                <img 
                  src={img} 
                  alt={`Corte Premium ${index + 1}`} 
                  className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-110 transition-all duration-1000"
                />
              </div>
              
              {/* Premium Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-700 bg-black/60 backdrop-blur-[2px]">
                <div className="relative overflow-hidden px-8 py-4 border border-gold-600/50">
                   <span className="relative z-10 text-gold-600 text-[10px] font-black uppercase tracking-[0.4em]">Explorar</span>
                </div>
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
