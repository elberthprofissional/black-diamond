import React from 'react';
import { motion } from 'framer-motion';

const Gallery: React.FC = () => {
  const placeholders = [
    "https://images.unsplash.com/photo-1512690196252-741ef2c7a30b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1593702295094-ada7444229ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1605497788044-5a32c7078486?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1532710093739-9470acff878f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1622286332915-a2f1bd0c9def?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
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
            <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.6em] uppercase mb-6">Nosso Ambiente</h2>
            <h3 className="text-5xl md:text-8xl font-serif font-bold text-white mb-8 tracking-tighter uppercase">GALERIA</h3>
            <div className="w-24 h-[1px] bg-gold-600/30 mx-auto"></div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {placeholders.map((img, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative aspect-square overflow-hidden bg-dark-card border border-white/5 cursor-pointer"
            >
              <img 
                src={img} 
                alt={`Trabalho ${index + 1}`} 
                className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000 scale-110 group-hover:scale-100"
              />
              
              {/* Overlay with icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/40 backdrop-blur-[2px]">
                <div className="w-16 h-[1px] bg-gold-600 -translate-x-4 group-hover:translate-x-0 transition-transform duration-700" />
                <span className="mx-4 text-gold-600 text-[10px] font-bold tracking-[0.3em] uppercase">Visualizar</span>
                <div className="w-16 h-[1px] bg-gold-600 translate-x-4 group-hover:translate-x-0 transition-transform duration-700" />
              </div>

              {/* Corner Accents */}
              <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-gold-600/0 group-hover:border-gold-600/50 transition-all duration-700" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-gold-600/0 group-hover:border-gold-600/50 transition-all duration-700" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
