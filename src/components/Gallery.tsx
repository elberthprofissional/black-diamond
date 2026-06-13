import React from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

const Gallery: React.FC = () => {
  // Placeholder images using a camera/photography theme
  const placeholders = [
    "https://images.unsplash.com/photo-1512690196252-741ef2c7a30b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1593702295094-ada7444229ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  ];

  return (
    <section id="galeria" className="py-32 md:py-48 bg-[#09090B] relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-24 lg:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.6em] uppercase mb-6">Trabalhos Recentes</h2>
            <h3 className="text-5xl md:text-[6rem] font-serif font-bold text-white mb-8 tracking-tighter uppercase leading-none">GALERIA</h3>
            <div className="w-12 h-[1px] bg-gold-600/30 mx-auto"></div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto px-4">
          {placeholders.map((img, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: index * 0.15 }}
              viewport={{ once: true }}
              className="group relative aspect-[4/5] overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer shadow-2xl"
            >
              {/* Image with extreme cinematic filter */}
              <img 
                src={img} 
                alt={`Corte Premium ${index + 1}`} 
                className="w-full h-full object-cover grayscale brightness-[0.3] blur-[1px] group-hover:blur-0 group-hover:grayscale-0 group-hover:brightness-90 transition-all duration-1000 scale-105 group-hover:scale-100"
              />
              
              {/* Professional Camera Placeholder Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 opacity-30 group-hover:opacity-0 transition-opacity duration-700">
                <Camera size={40} strokeWidth={1} className="text-zinc-400" />
                <span className="text-[9px] font-bold tracking-[0.4em] uppercase text-zinc-500">Preview 0{index + 1}</span>
              </div>

              {/* View Overlay - Premium Styling */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-700 bg-black/40 backdrop-blur-[2px]">
                <div className="relative group/btn overflow-hidden px-8 py-4">
                   <div className="absolute inset-0 border border-gold-600/30 group-hover/btn:scale-105 transition-transform duration-500" />
                   <span className="relative z-10 text-gold-600 text-[10px] font-black uppercase tracking-[0.4em]">Explorar</span>
                </div>
              </div>
              
              {/* Decorative corners */}
              <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-white/10 group-hover:border-gold-600/40 transition-colors duration-700" />
              <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-white/10 group-hover:border-gold-600/40 transition-colors duration-700" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
