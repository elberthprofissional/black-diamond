import { memo, type FC } from 'react';
import { motion } from 'framer-motion';
import { formatPricePublic } from '../lib/utils';
import { useServices } from '../hooks/useServices';

const Services: FC = memo(() => {
  const { services, loading, isOffline } = useServices();

  return (
    <section id="servicos" className="py-20 md:py-32 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/[0.03] blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-10 md:mb-20 text-center">
            <span className="text-[11px] sm:text-[12px] font-sans font-bold uppercase tracking-[0.3em] text-zinc-500 block mb-3 md:mb-4">
              SERVIÇOS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold uppercase tracking-tight font-sans text-white mb-2 md:mb-3">
              TABELA DE{' '}
              <span className="font-serif italic font-normal text-zinc-300 lowercase">
                serviços
              </span>
            </h2>
            <div className="w-12 md:w-16 h-[1px] bg-gold/50 mx-auto mt-4 md:mt-5" />
          </div>

          {/* Offline warning */}
          {isOffline && (
            <div className="mb-6 md:mb-8 px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-[11px] md:text-[12px] text-amber-400 font-medium">
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
                  className="flex items-center justify-between py-5 md:py-6 border-b border-white/[0.04]"
                >
                  <div className="space-y-2">
                    <div className="h-4 md:h-5 w-32 md:w-40 bg-white/5 rounded animate-pulse" />
                    <div className="h-2.5 md:h-3 w-20 md:w-24 bg-white/5 rounded animate-pulse" />
                  </div>
                  <div className="h-5 md:h-6 w-14 md:w-16 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t border-gold/20" role="list" aria-label="Lista de serviços">
              {services.map((service, idx) => (
                <motion.div
                  key={service.id}
                  role="listitem"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: idx * 0.08, ease: 'easeOut' }}
                  className="group flex items-center justify-between py-4 md:py-6 border-b border-white/[0.04] hover:border-gold/20 transition-colors duration-300"
                >
                  {/* Left: Number + Name */}
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-6 min-w-0 flex-1">
                    {/* Number - hidden on mobile (<640px) to save space */}
                    <span className="hidden sm:block text-[10px] md:text-[11px] font-sans font-bold text-zinc-700 w-4 md:w-6 shrink-0 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    {/* Service name - truncates on small screens */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm md:text-lg font-sans font-bold text-white uppercase tracking-[0.02em] md:tracking-[0.04em] truncate group-hover:text-gold transition-colors duration-300">
                        {service.name}
                      </h4>
                    </div>
                  </div>

                  {/* Right: Price */}
                  <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-2 sm:ml-0">
                    <span className="text-sm sm:text-base md:text-xl font-sans font-bold text-gold tracking-wide tabular-nums whitespace-nowrap">
                      {formatPricePublic(service.price)}
                    </span>
                  </div>
                </motion.div>
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
