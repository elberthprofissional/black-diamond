import React from 'react';
import { Check } from 'lucide-react';
import type { Service } from '../../types';

interface ServiceStepProps {
  services: Service[];
  selectedServices: Service[];
  isMensalista?: boolean;
  onToggle: (service: Service) => void;
  onSkip?: () => void;
  layout: 'desktop' | 'mobile';
}

const ServiceStep: React.FC<ServiceStepProps> = React.memo(({ services, selectedServices, isMensalista = false, onToggle, onSkip, layout }) => {
  const isSelected = (id: string) => selectedServices.some(s => s.id === id);

  if (layout === 'desktop') {
    return (
      <div className="space-y-6">
        {isMensalista && (
          <div className="p-4 bg-[#C5A059]/[0.06] border border-[#C5A059]/20 rounded-xl">
            <p className="text-[13px] text-[#C5A059] font-medium">Corte de Cabelo incluso no plano mensal</p>
            <p className="text-[12px] text-zinc-500 mt-1">Selecione serviços adicionais ou pule esta etapa.</p>
          </div>
        )}

        <div className="space-y-2" role="group" aria-label="Serviços disponíveis">
          {services.map((service) => {
            const selected = isSelected(service.id);
            return (
              <button
                key={service.id}
                onClick={() => onToggle(service)}
                aria-pressed={selected}
                aria-label={`Serviço ${service.name}. Preço: R$ ${Number(service.price).toFixed(0)}. Duração: ${service.duration} minutos. ${selected ? 'Selecionado' : 'Não selecionado'}`}
                className={`w-full flex items-center gap-5 px-6 py-5 rounded-xl transition-all duration-200 text-left group ${
                  selected ? 'bg-[#C5A059]/[0.06]' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                  selected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-white/20'
                }`}>
                  {selected && <Check size={11} className="text-white stroke-[3px]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium ${selected ? 'text-[#C5A059]' : 'text-white'}`}>{service.name}</p>
                </div>
                <span className={`text-[14px] font-semibold tabular-nums w-16 text-right ${selected ? 'text-[#C5A059]' : 'text-zinc-400'}`}>
                  R$ {Number(service.price).toFixed(0)}
                </span>
              </button>
            );
          })}
        </div>

        {isMensalista && onSkip && (
          <div className="pt-4">
            <button
              type="button"
              onClick={onSkip}
              className="px-6 py-3 bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[13px] font-medium rounded-xl hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer"
            >
              Pular sem adicionar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isMensalista && (
        <div className="p-3 bg-[#C5A059]/[0.06] border border-[#C5A059]/20 rounded-xl">
          <p className="text-[12px] text-[#C5A059] font-medium">Corte incluso no plano mensal</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Selecione adicionais ou pule.</p>
        </div>
      )}

      <div className="bg-white/[0.02] rounded-2xl overflow-hidden divide-y divide-white/[0.04]" role="group" aria-label="Serviços disponíveis">
        {services.map((service) => {
          const selected = isSelected(service.id);
          return (
            <button
              key={service.id}
              onClick={() => onToggle(service)}
              aria-pressed={selected}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all cursor-pointer ${
                selected ? 'bg-[#C5A059]/[0.04]' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all shrink-0 ${
                selected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-white/15'
              }`}>
                {selected && <Check size={10} className="text-white stroke-[3]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-medium transition-colors ${selected ? 'text-[#C5A059]' : 'text-zinc-200'}`}>
                  {service.name}
                </p>
              </div>
              <span className={`text-[13px] font-semibold tabular-nums transition-colors ${selected ? 'text-[#C5A059]' : 'text-zinc-400'}`}>
                R$ {Number(service.price).toFixed(0)}
              </span>
            </button>
          );
        })}
      </div>

      {isMensalista && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="w-full py-3 bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[13px] font-medium rounded-xl hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer"
        >
          Pular sem adicionar
        </button>
      )}
    </div>
  );
});

ServiceStep.displayName = 'ServiceStep';

export default ServiceStep;
