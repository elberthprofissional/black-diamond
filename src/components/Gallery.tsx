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
    <section id="galeria" className="py-40 bg-dark-pure relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.6em] uppercase mb-6">Trabalhos Recentes</h2>
            <h3 className="text-4xl md:text-7xl font-serif font-bold text-white mb-8 tracking-tighter uppercase">GALERIA</h3>
            <div className="w-12 h-[1px] bg-gold-600/30 mx-auto"></div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {placeholders.map((img, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="group relative aspect-[4/5] overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer"
            >
              <img 
                src={img} 
                alt={`Corte Premium ${index + 1}`} 
                className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-90 transition-all duration-1000 scale-105 group-hover:scale-100"
              />
              
              {/* Camera Icon Placeholder for empty feel */}
              <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-0 transition-opacity duration-500">
                <Camera className="text-white w-10 h-10 font-light" />
              </div>

              {/* View Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/40 backdrop-blur-[2px]">
                <span className="text-gold-600 text-[9px] font-black uppercase tracking-[0.4em] border border-gold-600/30 px-6 py-3">Ver Detalhes</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
