import { Check } from 'lucide-react';
import type { Service } from '../../../types';

interface MobileServicesStepProps {
  services: Service[];
  selectedServices: Service[];
  isMensalista?: boolean;
  onToggleService: (service: Service) => void;
}

export default function MobileServicesStep({
  services,
  selectedServices,
  isMensalista = false,
  onToggleService,
}: MobileServicesStepProps) {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="space-y-1 shrink-0">
        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Serviços</h2>
        <p className="text-xs text-zinc-500">
          {isMensalista
            ? 'Serviço incluso no plano. Deseja adicionar algo?'
            : 'Selecione os serviços desejados'}
        </p>
      </div>

      {isMensalista && (
        <div className="p-3 bg-[#C5A059]/[0.06] border border-[#C5A059]/20 rounded-xl shrink-0">
          <p className="text-[12px] text-[#C5A059] font-medium">Corte incluso no plano mensal</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Selecione adicionais ou pule.</p>
        </div>
      )}

      <div className="divide-y divide-white/[0.04] border-t border-b border-white/[0.04] overflow-y-auto flex-1 scrollbar-hide pb-4">
        {services.map(service => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          return (
            <button
              key={service.id}
              onClick={() => onToggleService(service)}
              className="w-full flex items-center justify-between py-4 px-1 bg-transparent transition-all active:opacity-70 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {isSelected ? (
                    <Check size={16} className="text-[#C5A059]" strokeWidth={3} />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold tracking-wide uppercase ${isSelected ? 'text-[#C5A059]' : 'text-zinc-200'}`}>
                    {service.name}
                  </p>
                </div>
              </div>
              <span className={`font-black text-sm shrink-0 ${isSelected ? 'text-[#C5A059]' : 'text-zinc-400'}`}>
                R$ {Number(service.price).toFixed(0)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
