import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getServices } from '../lib/api';
import type { Service } from '../types';

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
    <section id="servicos" className="py-32 bg-[#0d1117] text-white relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10 max-w-5xl">
        <div className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.4em] uppercase mb-4">Investimento</h2>
            <h3 className="text-4xl md:text-6xl font-serif font-bold text-white mb-2">TABELA DE SERVIÇOS</h3>
            <p className="text-gray-500 font-sans text-sm tracking-widest uppercase">Escolha sua experiência</p>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-[#161b22] border border-[#30363d] rounded-md overflow-hidden shadow-2xl">
            <div className="hidden md:grid grid-cols-12 gap-4 p-6 bg-[#0d1117] border-b border-[#30363d] text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              <div className="col-span-6">Serviço</div>
              <div className="col-span-2 text-center">Duração</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-2 text-right">Ação</div>
            </div>

            <div className="divide-y divide-[#30363d]">
              {services.map((service) => (
                <div 
                  key={service.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 md:items-center hover:bg-[#1f2937]/30 transition-colors group"
                >
                  <div className="col-span-1 md:col-span-6">
                    <h4 className="text-lg font-serif font-bold text-white group-hover:text-gold-600 transition-colors">{service.name}</h4>
                    <p className="text-sm text-gray-500 font-light mt-1">{service.description}</p>
                  </div>
                  <div className="col-span-1 md:col-span-2 md:text-center">
                    <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
                      {service.duration} MIN
                    </span>
                  </div>
                  <div className="col-span-1 md:col-span-2 md:text-right">
                    <span className="text-xl font-serif font-bold text-white group-hover:text-gold-600 transition-colors">
                      R$ {Number(service.price).toFixed(0)}
                    </span>
                  </div>
                  <div className="col-span-1 md:col-span-2 text-right">
                    <button 
                      onClick={onOpenBooking}
                      className="w-full md:w-auto bg-gold-600 hover:bg-gold-hover text-black font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-sm transition-all shadow-[0_0_20px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.3em] font-bold">
            Atendimento com hora marcada para sua conveniência
          </p>
        </div>
      </div>
    </section>
  );
};

export default Services;
