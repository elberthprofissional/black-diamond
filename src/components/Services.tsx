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
            <h3 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4 tracking-tight uppercase">SERVIÇOS</h3>
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
                className="grid grid-cols-1 md:grid-cols-12 gap-6 py-12 md:items-center hover:bg-white/[0.02] transition-all duration-500 group cursor-pointer"
                onClick={() => navigate('/agendar')}
              >
                {/* Number & Name Column */}
                <div className="col-span-1 md:col-span-9">
                  <div className="flex items-baseline space-x-8">
                    <span className="text-[10px] text-gold-600/40 font-bold tracking-widest font-serif group-hover:text-gold-600 transition-colors duration-500">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <div>
                      <h4 className="text-xl md:text-2xl font-serif font-medium text-white group-hover:text-gold-600 transition-colors duration-500 uppercase tracking-wider">{service.name}</h4>
                      <p className="text-sm text-gray-500 font-light mt-2 tracking-wide max-w-xl group-hover:text-gray-400 transition-colors duration-500">{service.description}</p>
                    </div>
                  </div>
                </div>
                
                {/* Price Column */}
                <div className="col-span-1 md:col-span-3 text-right">
                  <span className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tighter group-hover:text-gold-600 transition-colors duration-500">
                    R$ {Number(service.price).toFixed(0)}
                  </span>
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
