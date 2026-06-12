import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, Navigation } from 'lucide-react';

const Location: React.FC = () => {
  return (
    <section id="localização" className="py-40 bg-dark-pure relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-stretch gap-16">
          
          {/* Info Column */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-5/12 flex flex-col justify-center"
          >
            <div className="flex items-center space-x-4 mb-8">
              <div className="h-[1px] w-12 bg-gold-600"></div>
              <h2 className="text-gold-600 font-sans font-bold text-xs md:text-sm tracking-[0.5em] uppercase">Venha nos visitar</h2>
            </div>
            
            <h3 className="text-4xl md:text-6xl font-serif font-bold text-white mb-12 leading-tight">Onde Estamos <br /><span className="italic text-gold-600">Localizados.</span></h3>
            
            <div className="space-y-12">
              <div className="flex items-start space-x-6 group">
                <div className="w-12 h-12 bg-dark-card border border-white/5 flex items-center justify-center shrink-0 group-hover:border-gold-600/50 transition-colors duration-500">
                  <MapPin className="text-gold-600 w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-[10px] tracking-[0.3em] uppercase mb-2">Endereço</h4>
                  <p className="text-gray-400 font-light text-lg">Av. Brasílio da Gama, 139 - Bairro Tupi, <br />Belo Horizonte — MG</p>
                </div>
              </div>

              <div className="flex items-start space-x-6 group">
                <div className="w-12 h-12 bg-dark-card border border-white/5 flex items-center justify-center shrink-0 group-hover:border-gold-600/50 transition-colors duration-500">
                  <Clock className="text-gold-600 w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-[10px] tracking-[0.3em] uppercase mb-2">Horário de Atendimento</h4>
                  <p className="text-gray-400 font-light text-lg">Segunda a Sábado — 08:30 às 19:00</p>
                </div>
              </div>

              <div className="flex items-start space-x-6 group">
                <div className="w-12 h-12 bg-dark-card border border-white/5 flex items-center justify-center shrink-0 group-hover:border-gold-600/50 transition-colors duration-500">
                  <Phone className="text-gold-600 w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-[10px] tracking-[0.3em] uppercase mb-2">Contato Direto</h4>
                  <p className="text-gray-400 font-light text-lg">(31) 99955-3580</p>
                </div>
              </div>
            </div>

            <div className="mt-16">
              <button 
                onClick={() => window.open('https://maps.google.com', '_blank')}
                className="group flex items-center space-x-4 bg-white/5 border border-white/10 px-10 py-6 hover:bg-gold-600 hover:text-black transition-all duration-500"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Abrir no Google Maps</span>
                <Navigation className="w-4 h-4 translate-x-0 group-hover:translate-x-2 transition-transform duration-500" />
              </button>
            </div>
          </motion.div>

          {/* Map Column */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="w-full lg:w-7/12 relative min-h-[500px] group"
          >
            <div className="absolute -inset-2 border border-gold-600/20 translate-x-2 translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700" />
            <div className="w-full h-full bg-dark-card border border-white/5 relative overflow-hidden">
              {/* Monochromatic Map Placeholder */}
              <div 
                className="absolute inset-0 grayscale contrast-125 brightness-[0.4] hover:brightness-[0.6] transition-all duration-700 bg-cover bg-center"
                style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80")' }}
              />
              {/* Map Glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-16 h-16 bg-gold-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.4)] animate-pulse">
                   <MapPin className="text-black w-8 h-8" />
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Location;
