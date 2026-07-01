import React from 'react';
import { Check } from 'lucide-react';
import type { Service } from '../../types';

interface ServiceStepProps {
  services: Service[];
  selectedServices: Service[];
  onToggle: (service: Service) => void;
  layout: 'desktop' | 'mobile';
}

const ServiceStep: React.FC<ServiceStepProps> = React.memo(({ services, selectedServices, onToggle, layout }) => {
  const isSelected = (id: string) => selectedServices.some(s => s.id === id);

  if (layout === 'desktop') {
    return (
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
    );
  }

  return (
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
  );
});

ServiceStep.displayName = 'ServiceStep';

export default ServiceStep;
