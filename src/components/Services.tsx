import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { getServices } from '../lib/api';
import type { Service } from '../types';
import { useNavigate } from 'react-router-dom';

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getServices()
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  return (
    <section id="servicos" className="py-32 md:py-48 bg-[#09090B] text-white relative overflow-hidden border-t border-white/5">
      <div className="container mx-auto px-6 relative z-10 max-w-5xl">
        <div className="text-center mb-24 lg:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.5em] uppercase mb-4">Investimento</h2>
            <h3 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4 tracking-tight">EXPERIÊNCIAS</h3>
            <div className="h-[1px] w-12 bg-gold-600/30 mx-auto"></div>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="divide-y divide-white/5 border-y border-white/5"
          >
            {services.map((service, index) => (
              <motion.div 
                key={service.id}
                variants={itemVariants}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 py-12 md:items-center hover:bg-white/[0.03] transition-all duration-500 group cursor-pointer relative"
                onClick={() => navigate('/agendar')}
              >
                <div className="col-span-1 md:col-span-7">
                  <div className="flex items-baseline space-x-8">
                    <span className="text-[10px] text-gold-600/40 font-bold tracking-widest font-serif group-hover:text-gold-600 transition-colors duration-500">0{index + 1}</span>
                    <div>
                      <h4 className="text-xl md:text-2xl font-serif font-medium text-white group-hover:text-gold-600 transition-colors duration-500">{service.name}</h4>
                      <p className="text-sm text-gray-500 font-light mt-2 tracking-wide max-w-md group-hover:text-gray-300 transition-colors duration-500">{service.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-1 rounded-full bg-gold-600/30 group-hover:bg-gold-600 transition-colors duration-500"></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] group-hover:text-gray-300 transition-colors duration-500">
                      {service.duration} MIN
                    </span>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-3 text-right flex items-center justify-end space-x-10">
                  <span className="text-2xl font-serif font-bold text-white tracking-tighter group-hover:text-gold-600 transition-colors duration-500">
                    R$ {Number(service.price).toFixed(0)}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate('/agendar'); }}
                    className="opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 text-gold-600 text-[9px] font-black uppercase tracking-[0.4em] border-b border-gold-600/30 hover:border-gold-600 pb-1"
                  >
                    Reservar
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="mt-24 text-center">
          <p className="text-gray-700 text-[9px] uppercase tracking-[0.4em] font-bold">
            Atendimento exclusivo com hora marcada
          </p>
        </div>
      </div>
    </section>
  );
};

export default Services;
