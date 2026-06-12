import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getServices } from '../lib/api';
import type { Service } from '../types';
import { Clock, Scissors } from 'lucide-react';

interface ServicesProps {
  onOpenBooking: () => void;
}

const Services: React.FC<ServicesProps> = ({ onOpenBooking }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getServices()
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="servicos" className="py-32 bg-dark relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-600/5 rounded-full blur-[120px] -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold-600/5 rounded-full blur-[120px] -ml-64 -mb-64" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-gold-600 font-serif italic text-lg mb-4 tracking-widest uppercase">Arte em Barbearia</h2>
            <h3 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6">Nossos Serviços</h3>
            <div className="flex items-center justify-center space-x-4">
              <div className="w-12 h-[1px] bg-gold-600/30"></div>
              <Scissors className="text-gold-600 w-5 h-5" />
              <div className="w-12 h-[1px] bg-gold-600/30"></div>
            </div>
          </motion.div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-light tracking-widest uppercase text-xs">Carregando menu...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-[#0a0a0a] border border-white/5 p-10 hover:border-gold-600/40 transition-all duration-500 overflow-hidden"
              >
                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gold-600/0 group-hover:bg-gold-600/[0.02] transition-colors duration-500" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <h4 className="text-2xl font-serif font-bold text-white group-hover:text-gold-600 transition-colors duration-500 leading-tight pr-4">
                      {service.name}
                    </h4>
                    <div className="flex flex-col items-end">
                      <span className="text-gold-600 font-bold text-2xl tracking-tighter">
                        R$ {Number(service.price).toFixed(0)}
                      </span>
                      <span className="text-[10px] text-gray-600 uppercase tracking-widest">A partir de</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-500 mb-10 font-light leading-relaxed text-sm min-h-[3rem]">
                    {service.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center text-gray-400 text-[11px] uppercase tracking-widest font-medium">
                      <Clock className="w-4 h-4 mr-2 text-gold-600" />
                      <span>{service.duration} MIN</span>
                    </div>
                    <button 
                      onClick={onOpenBooking}
                      className="text-gold-600 text-[10px] uppercase tracking-[0.2em] font-bold opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0"
                    >
                      Reservar →
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-20 text-center">
          <button 
            onClick={onOpenBooking}
            className="group relative px-16 py-5 overflow-hidden"
          >
            <div className="absolute inset-0 border border-gold-600/30 group-hover:border-gold-600 transition-colors duration-500" />
            <span className="relative z-10 text-white group-hover:text-gold-600 transition-colors duration-500 text-[11px] uppercase tracking-[0.3em] font-bold">
              Ver Tabela Completa
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Services;
