import { useState, useEffect, memo, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useServices } from '../hooks/useServices';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { getMensalistaPlans, getMensalistaEnabled } from '../lib/api';
import type { MensalistaPlan, Service } from '../types';

interface ServicesProps {
  onBookingClick: () => void;
}

const Services: FC<ServicesProps> = memo(({ onBookingClick }) => {
  const { services, loading, isOffline } = useServices();
  const { barberPhone } = useBarberSettings();

  const [plans, setPlans] = useState<MensalistaPlan[]>([]);
  const [mensalistaEnabled, setMensalistaEnabled] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [showPlansModal, setShowPlansModal] = useState(false);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const [enabled, plansData] = await Promise.all([
          getMensalistaEnabled(),
          getMensalistaPlans(true),
        ]);
        setMensalistaEnabled(enabled);
        setPlans(plansData);
      } catch {
        // Silently fail - section just won't show
      } finally {
        setPlansLoading(false);
      }
    };
    loadPlans();
  }, []);

  const getServiceName = (serviceId: string, allServices: Service[]) => {
    return allServices.find((s) => s.id === serviceId)?.name || 'Serviço';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const handlePlanClick = (plan: MensalistaPlan) => {
    if (barberPhone) {
      const msg = `${getGreeting()}! Me interessei pelo ${plan.name} (R$ ${Number(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês). Poderia me explicar melhor o que está incluso?`;
      const url = `https://wa.me/${barberPhone}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    }
  };

  const showMensalista = mensalistaEnabled && plans.length > 0 && !plansLoading;

  return (
    <section id="servicos" className="py-24 md:py-60 bg-[#0A0A0A]">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-20 md:mb-32">
            <h2 className="text-3xl md:text-5xl font-bebas tracking-[0.4em] text-white uppercase mb-4 text-center">
              Tabela de Serviços
            </h2>
            <div className="w-24 h-px bg-[#C5A059]/30 mx-auto" />
          </div>

          {isOffline && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-[12px] text-amber-400 font-medium">
                Sem conexao. Dados salvos no celular — voce pode continuar navegando.
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
            <div className="space-y-0" role="list" aria-label="Lista de serviços">
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
                  className="group py-8 md:py-12 flex items-center justify-between border-b border-white/[0.03] cursor-pointer hover:border-[#C5A059]/30 transition-all duration-700"
                  onClick={onBookingClick}
                >
                  <h4 className="text-2xl sm:text-3xl md:text-5xl font-bebas text-white uppercase tracking-wider group-hover:text-[#C5A059] transition-all duration-700">
                    {service.name}
                  </h4>

                  <div className="flex items-baseline gap-4 shrink-0">
                    <span className="text-lg sm:text-xl md:text-3xl font-bebas text-[#C5A059] whitespace-nowrap opacity-80 group-hover:opacity-100 transition-all duration-700">
                      R$ {Number(service.price).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Banner Planos Mensais */}
          {showMensalista && (
            <div className="mt-16 md:mt-24 border border-white/[0.04] md:border-[#C5A059]/20 rounded-2xl p-5 md:p-10 bg-white/[0.01] md:bg-[#C5A059]/[0.03]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                    <span className="text-[9px] md:text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.3em]">
                      Planos Mensais
                    </span>
                  </div>
                  <h3 className="text-lg md:text-2xl font-bebas text-white uppercase tracking-wider">
                    Economize com um plano mensal
                  </h3>
                  <p className="text-[13px] md:text-sm text-zinc-400 leading-relaxed max-w-lg">
                    Escolha um plano e tenha serviços inclusos todo mês.
                    <span className="text-zinc-400"> Conheça nossos planos!</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowPlansModal(true)}
                  className="shrink-0 px-6 md:px-8 py-3 md:py-3.5 border border-[#C5A059]/20 md:border-[#C5A059]/40 text-[#C5A059] font-bold text-[9px] md:text-[10px] uppercase tracking-[0.2em] rounded-lg md:rounded-xl hover:bg-[#C5A059]/10 transition-all cursor-pointer"
                >
                  Conheça os planos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Planos - Mobile: Tela Cheia / Desktop: Modal */}
      <AnimatePresence>
        {showPlansModal && (
          <>
            {/* Mobile: Full Screen */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-[500] bg-[#0A0A0A] lg:hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPlansModal(false)}
                    className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                  <h3 className="text-[15px] font-semibold text-white">Planos Mensais</h3>
                </div>
              </div>

              {/* Plans List */}
              <div className="flex-1 overflow-y-auto">
                {plans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className={`px-5 py-5 ${index > 0 ? 'border-t border-white/[0.04]' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-semibold text-white truncate">
                          {plan.name}
                        </h4>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-[18px] font-bold text-[#C5A059]">
                            R${' '}
                            {Number(plan.price).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <span className="text-[11px] text-zinc-500">/mês</span>
                        </div>
                      </div>
                    </div>

                    {plan.included_service_ids && plan.included_service_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {plan.included_service_ids.map((sid) => (
                          <span
                            key={sid}
                            className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full"
                          >
                            {getServiceName(sid, services)}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handlePlanClick(plan)}
                      className="w-full py-3.5 bg-[#C5A059] text-black font-bold text-[11px] uppercase tracking-[0.1em] rounded-xl hover:bg-[#C5A059] transition-all cursor-pointer active:scale-[0.98]"
                    >
                      Tenho interesse
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/[0.04] text-center shrink-0">
                <p className="text-[10px] text-zinc-600">
                  Ao clicar, você será redirecionado para o WhatsApp
                </p>
              </div>
            </motion.div>

            {/* Desktop: Modal Centralizado */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hidden lg:flex fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm items-center justify-center p-4"
              onClick={() => setShowPlansModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="w-full max-w-md bg-[#111111] rounded-2xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-bold text-white">Planos Mensais</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Escolha o plano ideal</p>
                  </div>
                  <button
                    onClick={() => setShowPlansModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <X size={16} className="text-zinc-400" />
                  </button>
                </div>

                {/* Plans List */}
                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="border border-white/[0.06] rounded-xl p-4 hover:border-[#C5A059]/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                            <h4 className="text-[14px] font-bold text-white">{plan.name}</h4>
                          </div>
                          <div className="flex items-baseline gap-1 mt-1 ml-3.5">
                            <span className="text-xl font-bebas text-[#C5A059]">
                              R${' '}
                              {Number(plan.price).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            <span className="text-[10px] text-zinc-500">/mês</span>
                          </div>
                        </div>
                      </div>

                      {plan.included_service_ids && plan.included_service_ids.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3 ml-3.5">
                          {plan.included_service_ids.map((sid) => (
                            <span
                              key={sid}
                              className="text-[10px] font-medium text-[#C5A059]/80 bg-[#C5A059]/[0.08] px-2 py-0.5 rounded-md"
                            >
                              {getServiceName(sid, services)}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handlePlanClick(plan)}
                        className="w-full py-2.5 bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] font-bold text-[10px] uppercase tracking-[0.15em] rounded-lg hover:bg-[#C5A059]/20 transition-all cursor-pointer"
                      >
                        Tenho interesse
                      </button>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-white/[0.06] text-center">
                  <p className="text-[10px] text-zinc-600">
                    Ao clicar, você será redirecionado para o WhatsApp
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
});

Services.displayName = 'Services';

export default Services;
