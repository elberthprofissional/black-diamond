import { memo, type FC } from 'react';
import { formatPricePublic } from '../lib/utils';
import { useServices } from '../hooks/useServices';

const Services: FC = memo(() => {
  const { services, loading, isOffline } = useServices();

  return (
    <section id="servicos" className="py-24 md:py-32 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/[0.03] blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-14 md:mb-20 text-center">
            <span className="text-[11px] font-sans font-bold uppercase tracking-[0.3em] text-zinc-500 block mb-4">
              SERVIÇOS
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight font-sans text-white mb-3">
              TABELA DE{' '}
              <span className="font-serif italic font-normal text-zinc-300 lowercase">
                serviços
              </span>
            </h2>
            <div className="w-16 h-[1px] bg-[#D4AF37]/50 mx-auto mt-5" />
          </div>

          {/* Offline warning */}
          {isOffline && (
            <div className="mb-8 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-[12px] text-amber-400 font-medium">
                Sem conexão. Dados salvos no celular — você pode continuar navegando.
              </p>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="space-y-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-6 border-b border-white/[0.04]"
                >
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="border-t border-[#D4AF37]/20"
              role="list"
              aria-label="Lista de serviços"
            >
              {services.map((service, idx) => (
                <div
                  key={service.id}
                  role="listitem"
                  className="group flex items-center justify-between py-5 md:py-6 border-b border-white/[0.04] hover:border-[#D4AF37]/20 transition-colors duration-300 px-1"
                >
                  {/* Left: Number + Name */}
                  <div className="flex items-center gap-4 md:gap-6 min-w-0">
                    <span className="text-[11px] font-sans font-bold text-zinc-700 w-6 shrink-0 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm md:text-lg font-sans font-bold text-white uppercase tracking-[0.04em] group-hover:text-[#D4AF37] transition-colors duration-300">
                        {service.name}
                      </h4>
                    </div>
                  </div>

                  {/* Right: Price */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-base md:text-xl font-sans font-bold text-[#D4AF37] tracking-wide tabular-nums">
                      {formatPricePublic(service.price)}
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
});

Services.displayName = 'Services';

export default Services;
