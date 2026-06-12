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
    <section id="servicos" className="py-32 bg-[#f4f4f4] text-black relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.4em] uppercase mb-4">Especialidades</h2>
            <h3 className="text-4xl md:text-7xl font-serif font-bold text-black leading-tight tracking-tighter">Serviços que <br /> definem seu estilo.</h3>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="hidden md:block pb-4"
          >
            <Scissors className="text-gray-300 w-24 h-24 rotate-12" />
          </motion.div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group flex justify-between items-end border-b border-gray-200 pb-8 hover:border-gold-600 transition-colors duration-500 cursor-pointer"
                onClick={onOpenBooking}
              >
                <div className="flex-1 pr-6">
                  <div className="flex items-center space-x-4 mb-2">
                    <span className="text-[10px] text-gold-600 font-bold tracking-widest uppercase">0{index + 1}</span>
                    <h4 className="text-xl md:text-2xl font-serif font-bold group-hover:text-gold-600 transition-colors duration-300">
                      {service.name}
                    </h4>
                  </div>
                  <p className="text-gray-500 font-light text-sm tracking-wide">
                    {service.description || "A melhor experiência para o seu visual."}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="text-gray-400 text-[10px] font-bold tracking-[0.2em] mb-1 uppercase">
                    {service.duration} MIN
                  </div>
                  <div className="text-2xl font-serif font-bold">
                    R$ {Number(service.price).toFixed(0)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-24 flex justify-center">
          <button 
            onClick={onOpenBooking}
            className="px-16 py-6 border border-black text-black text-[10px] font-bold uppercase tracking-[0.5em] hover:bg-black hover:text-white transition-all duration-500"
          >
            Agendar Experiência
          </button>
        </div>
      </div>
    </section>
  );
};

export default Services;
