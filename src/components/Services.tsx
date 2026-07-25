import { memo, type FC } from 'react';
import { formatPricePublic } from '../lib/utils';
import { useServices } from '../hooks/useServices';

interface ServicesProps {
  onBookingClick: () => void;
}

const Services: FC<ServicesProps> = memo(({ onBookingClick }) => {
  const { services, loading, isOffline } = useServices();

  return (
    <section id="servicos" className="py-24 md:py-60 bg-[#0A0A0A]">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-20 md:mb-32">
            <h2 className="text-3xl md:text-5xl font-bebas tracking-[0.4em] text-white uppercase mb-4 text-center">
              Tabela de Serviços
            </h2>
            <div className="w-24 h-px bg-[#D4AF37]/30 mx-auto" />
          </div>

          {isOffline && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-[12px] text-amber-400 font-medium">
                Sem conexão. Dados salvos no celular — você pode continuar navegando.
              </p>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-5 border-b border-white/[0.04]"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-16 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="w-full max-w-2xl mx-auto space-y-0"
              role="list"
              aria-label="Lista de serviços"
            >
              {services.map((service) => (
                <div
                  key={service.id}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onBookingClick();
                    }
                  }}
                  className="group py-6 md:py-12 flex items-center justify-between border-b border-white/[0.03] cursor-pointer hover:border-[#D4AF37]/30 transition-all duration-700"
                  onClick={onBookingClick}
                >
                  <h4 className="text-xl sm:text-3xl md:text-5xl font-bebas text-white uppercase tracking-wider group-hover:text-[#D4AF37] transition-all duration-700">
                    {service.name}
                  </h4>

                  <span className="text-base sm:text-xl md:text-3xl font-bebas text-[#D4AF37] whitespace-nowrap opacity-80 group-hover:opacity-100 transition-all duration-700">
                    {formatPricePublic(service.price)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

Services.displayName = 'Services';

export default Services;
