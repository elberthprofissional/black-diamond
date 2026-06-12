import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getServices } from '../lib/api';
import type { Service } from '../types';
import { Scissors } from 'lucide-react';

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
    <section id="servicos" className="py-40 bg-dark-pure relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold-600/5 rounded-full blur-[180px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-gold-600 font-sans font-bold text-xs md:text-sm tracking-[0.6em] uppercase mb-6">Menu de Experiências</h2>
            <h3 className="text-5xl md:text-8xl font-serif font-bold text-white mb-8 tracking-tighter">NOSSOS SERVIÇOS</h3>
            <div className="flex items-center justify-center space-x-6">
              <div className="w-16 h-[1px] bg-gold-600/30"></div>
              <Scissors className="text-gold-600 w-6 h-6" />
              <div className="w-16 h-[1px] bg-gold-600/30"></div>
            </div>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></div>
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
                className="group relative bg-dark-card border border-white/5 p-12 hover:border-gold-600/40 transition-all duration-700 cursor-pointer"
                onClick={onOpenBooking}
              >
                {/* Number Indicator */}
                <span className="absolute top-8 right-12 text-white/5 text-7xl font-serif font-black transition-colors duration-700 group-hover:text-gold-600/10 pointer-events-none">
                  {(index + 1).toString().padStart(2, '0')}
                </span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-10">
                    <h4 className="text-2xl md:text-3xl font-serif font-bold text-white group-hover:text-gold-600 transition-colors duration-500 leading-tight pr-10">
                      {service.name}
                    </h4>
                  </div>
                  
                  <p className="text-gray-500 mb-12 font-light leading-relaxed text-base min-h-[4rem]">
                    {service.description || "Técnicas clássicas com finalização moderna."}
                  </p>
                  
                  <div className="flex items-center justify-between pt-8 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-gold-600 font-serif font-bold text-3xl tracking-tighter">
                        R$ {Number(service.price).toFixed(0)}
                      </span>
                      <span className="text-[9px] text-gray-600 uppercase tracking-[0.3em] font-bold">Investimento</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white/60 text-[10px] font-bold tracking-[0.2em] mb-1 uppercase">
                        {service.duration} MINUTOS
                      </div>
                      <span className="text-gold-600 text-[10px] uppercase tracking-[0.3em] font-black group-hover:tracking-[0.4em] transition-all duration-500">
                        RESERVAR →
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gold-600/0 group-hover:bg-gold-600/[0.02] transition-all duration-700" />
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-32 text-center">
          <button 
            onClick={onOpenBooking}
            className="group relative px-20 py-6 overflow-hidden border border-white/10 hover:border-gold-600 transition-colors duration-700"
          >
            <span className="relative z-10 text-white font-bold text-[11px] uppercase tracking-[0.5em] group-hover:text-gold-600 transition-colors">
              Explorar Tabela Completa
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Services;
