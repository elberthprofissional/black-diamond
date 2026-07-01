import { Check } from 'lucide-react';
import type { Service } from '../../../types';

interface DesktopServicesStepProps {
  services: Service[];
  selectedServices: Service[];
  onToggleService: (service: Service) => void;
  onNextStep: () => void;
}

export default function DesktopServicesStep({
  services,
  selectedServices,
  onToggleService,
  onNextStep,
}: DesktopServicesStepProps) {
  return (
    <div className="space-y-6 lg:space-y-8 h-full flex flex-col overflow-visible">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold uppercase tracking-tight">ESCOLHA OS SERVIÇOS</h2>
        <p className="text-zinc-500 text-sm">Selecione os serviços que farão parte do atendimento.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-1 pb-0">
        {services.map(service => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          return (
            <div
              key={service.id}
              onClick={() => onToggleService(service)}
              className={`p-5 border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[140px] relative group select-none ${
                isSelected
                  ? 'border-[#C5A059] bg-[#C5A059]/[0.04]'
                  : 'border-white/[0.06] bg-[#111111] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 min-w-0">
                  <h3 className={`font-bold uppercase tracking-tight text-base leading-none truncate ${isSelected ? 'text-[#C5A059]' : 'text-zinc-300 group-hover:text-white'}`}>
                    {service.name}
                  </h3>
                </div>
                <div className={`w-4 h-4 border flex items-center justify-center transition-all shrink-0 ${isSelected ? 'border-[#C5A059] bg-transparent' : 'border-white/[0.08] group-hover:border-white/[0.15]'}`}>
                  {isSelected && <Check size={10} className="text-[#C5A059]" strokeWidth={3} />}
                </div>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-white/[0.04] mt-4">
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest">Valor</span>
                <span className={`font-bold text-lg ${isSelected ? 'text-[#C5A059]' : 'text-white'}`}>
                  R$ {Number(service.price).toFixed(0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-white/[0.04]">
        <button
          type="button"
          onClick={onNextStep}
          disabled={selectedServices.length === 0}
          className="px-10 py-4 bg-white text-black hover:bg-[#C5A059] text-[10px] font-bold uppercase tracking-[0.3em] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Avançar
        </button>
      </div>
    </div>
  );
}
