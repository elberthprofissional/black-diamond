import { Check, ChevronRight, Scissors } from 'lucide-react';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { formatPricePublic } from '../../../lib/utils';
import type { Service, Barber } from '../../../types';

interface ResponsiveServicesStepProps {
  services: Service[];
  selectedServices: Service[];
  isMensalista?: boolean;
  planName?: string;
  onToggleService: (service: Service) => void;
  onNextStep?: () => void;
  /** Multi-barbeiro: barbeiros disponíveis para escolha. */
  barbers?: Barber[];
  selectedBarber?: Barber | null;
  onSelectBarber?: (barber: Barber) => void;
  /** Modo barbeiro único: esconde o seletor de barbeiro. */
  singleBarberMode?: boolean;
}

export default function ResponsiveServicesStep({
  services,
  selectedServices,
  isMensalista = false,
  planName,
  onToggleService,
  onNextStep,
  barbers,
  selectedBarber,
  onSelectBarber,
  singleBarberMode = false,
}: ResponsiveServicesStepProps) {
  const bookableBarbers = (barbers || []).filter((b) => b.is_active);
  const showBarberSelector = !singleBarberMode && bookableBarbers.length > 1 && !!onSelectBarber;

  const renderBarberSelector = () => {
    if (!showBarberSelector) return null;
    return (
      <div className="space-y-2.5">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
          Atendimento com
        </p>
        <div className="flex flex-wrap gap-2">
          {bookableBarbers.map((barber) => {
            const isSelected = selectedBarber?.id === barber.id;
            return (
              <button
                key={barber.id}
                type="button"
                onClick={() => onSelectBarber?.(barber)}
                aria-pressed={isSelected}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[12px] font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gold/15 border-gold/50 text-gold'
                    : 'border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {barber.photo_url ? (
                  <img
                    src={barber.photo_url}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <Scissors size={12} />
                )}
                {barber.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  };
  const isDesktop = useIsDesktop();
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  if (isDesktop) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        {renderBarberSelector()}

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">Serviços</h2>
          <p className="text-[14px] text-zinc-500">
            {isMensalista
              ? 'Serviço incluso no plano. Deseja adicionar algo?'
              : 'Selecione os serviços para o atendimento.'}
          </p>
        </div>

        {isMensalista && (
          <div className="p-4 bg-gold/[0.06] border border-gold/20 rounded-xl">
            <p className="text-[14px] text-gold font-medium">
              {planName
                ? `Serviços inclusos no ${planName}`
                : 'Corte de Cabelo incluso no plano mensal'}
            </p>
            <p className="text-[12px] text-zinc-500 mt-1">
              Selecione serviços adicionais ou pule esta etapa.
            </p>
          </div>
        )}

        <div className="flex-1 space-y-0.5">
          {services.map((service) => {
            const isSelected = selectedServices.some((s) => s.id === service.id);
            return (
              <button
                key={service.id}
                onClick={() => onToggleService(service)}
                className={`w-full flex items-center justify-between py-4 px-1 transition-all cursor-pointer group ${
                  isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-gold border-gold'
                        : 'border-white/20 group-hover:border-white/40'
                    }`}
                  >
                    {isSelected && <Check size={12} className="text-black" strokeWidth={3} />}
                  </div>
                  <span
                    className={`text-[16px] font-medium transition-colors ${
                      isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  >
                    {service.name}
                  </span>
                </div>
                <span
                  className={`text-[16px] font-medium tabular-nums ${
                    isSelected ? 'text-gold' : 'text-zinc-500'
                  }`}
                >
                  {formatPricePublic(service.price)}
                </span>
              </button>
            );
          })}
        </div>

        {onNextStep && (
          <div className="pt-4 border-t border-white/[0.04] space-y-4">
            {selectedServices.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider">
                  Total
                </span>
                <span className="text-xl font-bold text-gold">{formatPricePublic(totalPrice)}</span>
              </div>
            )}
            <div className="flex gap-3">
              {isMensalista && (
                <button
                  type="button"
                  onClick={onNextStep}
                  className="px-8 py-4 bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[14px] font-medium rounded-xl hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer"
                >
                  Pular
                </button>
              )}
              <button
                type="button"
                onClick={onNextStep}
                disabled={!isMensalista && selectedServices.length === 0}
                className="btn-gold flex-1 py-4 text-[14px] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continuar <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mobile layout
  return (
    <div className="space-y-4 h-full flex flex-col">
      {renderBarberSelector()}

      <div className="space-y-2 shrink-0">
        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Serviços</h2>
        <p className="text-xs text-zinc-500">
          {isMensalista
            ? 'Serviço incluso no plano. Deseja adicionar algo?'
            : 'Selecione os serviços desejados'}
        </p>
      </div>

      {isMensalista && (
        <div className="p-3 bg-gold/[0.06] border border-gold/20 rounded-xl shrink-0">
          <p className="text-[12px] text-gold font-medium">
            {planName ? `Serviços inclusos no ${planName}` : 'Corte incluso no plano mensal'}
          </p>
          <p className="text-[12px] text-zinc-500 mt-0.5">Selecione adicionais ou pule.</p>
        </div>
      )}

      <div className="divide-y divide-white/[0.04] border-t border-b border-white/[0.04] overflow-y-auto flex-1 scrollbar-hide pb-4">
        {services.map((service) => {
          const isSelected = selectedServices.some((s) => s.id === service.id);
          return (
            <button
              key={service.id}
              onClick={() => onToggleService(service)}
              className="w-full flex items-center justify-between py-4 px-1 bg-transparent transition-all active:opacity-70 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {isSelected ? (
                    <Check size={16} className="text-gold" strokeWidth={3} />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[14px] font-bold tracking-wide uppercase ${isSelected ? 'text-gold' : 'text-zinc-200'}`}
                  >
                    {service.name}
                  </p>
                </div>
              </div>
              <span
                className={`font-black text-sm shrink-0 ${isSelected ? 'text-gold' : 'text-zinc-400'}`}
              >
                {formatPricePublic(service.price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
