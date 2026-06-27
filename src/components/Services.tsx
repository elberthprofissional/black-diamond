import React from 'react';
import { useServices } from '../hooks/useServices';

interface ServicesProps {
  onBookingClick: () => void;
}

const Services: React.FC<ServicesProps> = ({ onBookingClick }) => {
  const { services, loading } = useServices();

  return (
    <section id="servicos" className="py-24 md:py-60 bg-[#0A0A0A]">
      <div className="container mx-auto px-6">

        <div className="max-w-4xl mx-auto">
          <div className="mb-20 md:mb-32">
            <h2 className="text-3xl md:text-5xl font-bebas tracking-[0.4em] text-white uppercase mb-4 text-center">Tabela de Serviços</h2>
            <div className="w-24 h-px bg-[#D4AF37]/30 mx-auto" />
          </div>

          {loading ? (
            <div className="text-center py-20 text-zinc-900 font-bebas uppercase tracking-[0.4em] text-xs">Sincronizando sistema...</div>
          ) : (
            <div className="space-y-0" role="list" aria-label="Lista de serviços">
              {services.map((service) => (
                <div 
                  key={service.id}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBookingClick(); } }}
                  className="group py-8 md:py-12 flex items-center justify-between border-b border-white/[0.03] cursor-pointer hover:border-[#D4AF37]/30 transition-all duration-700"
                  onClick={onBookingClick}
                >
                  <h4 className="text-2xl sm:text-3xl md:text-5xl font-bebas text-white uppercase tracking-wider group-hover:text-[#D4AF37] transition-all duration-700">
                    {service.name}
                  </h4>
                  
                  <div className="flex items-baseline gap-4 shrink-0">
                    <span className="text-lg sm:text-xl md:text-3xl font-bebas text-[#D4AF37] whitespace-nowrap opacity-80 group-hover:opacity-100 transition-all duration-700">
                      R$ {Number(service.price).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Services;
