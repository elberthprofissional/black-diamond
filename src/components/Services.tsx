import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getServices } from '../lib/api';
import type { Service } from '../types';
import { Clock } from 'lucide-react';

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
    <section id="servicos" className="py-24 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-gold-600 font-serif italic text-lg mb-2">Excelência em cada detalhe</h2>
          <h3 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Nossos Serviços</h3>
          <div className="w-24 h-[1px] bg-gold-600 mx-auto"></div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400">Carregando serviços...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-dark-card border border-dark-border p-8 hover:border-gold-600/50 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xl font-serif font-bold text-white group-hover:text-gold-600 transition-colors">
                    {service.name}
                  </h4>
                  <span className="text-gold-600 font-bold text-xl">
                    R$ {Number(service.price).toFixed(2)}
                  </span>
                </div>
                <p className="text-gray-400 mb-6 font-light leading-relaxed">
                  {service.description}
                </p>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="w-4 h-4 mr-2 text-gold-600" />
                  <span>{service.duration} minutos</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <button 
            onClick={onOpenBooking}
            className="bg-gold-gradient text-black font-bold px-12 py-4 rounded-sm text-sm uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Ver Todos os Serviços
          </button>
        </div>
      </div>
    </section>
  );
};

export default Services;
