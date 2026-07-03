import { Check, ChevronRight } from 'lucide-react';
import type { Service } from '../../../types';

interface DesktopServicesStepProps {
  services: Service[];
  selectedServices: Service[];
  isMensalista?: boolean;
  onToggleService: (service: Service) => void;
  onNextStep: () => void;
}

export default function DesktopServicesStep({
  services,
  selectedServices,
  isMensalista = false,
  onToggleService,
  onNextStep,
}: DesktopServicesStepProps) {
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-white">Serviços</h2>
        <p className="text-[13px] text-zinc-500">
          {isMensalista
            ? 'Serviço incluso no plano. Deseja adicionar algo?'
            : 'Selecione os serviços para o atendimento.'}
        </p>
      </div>

      {/* Mensalista Banner */}
      {isMensalista && (
        <div className="p-4 bg-[#C5A059]/[0.06] border border-[#C5A059]/20 rounded-xl">
          <p className="text-[13px] text-[#C5A059] font-medium">Corte de Cabelo incluso no plano mensal</p>
          <p className="text-[12px] text-zinc-500 mt-1">Selecione serviços adicionais ou pule esta etapa.</p>
        </div>
      )}

      {/* Services List */}
      <div className="flex-1 space-y-0.5">
        {services.map(service => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          return (
            <button
              key={service.id}
              onClick={() => onToggleService(service)}
              className={`w-full flex items-center justify-between py-4 px-1 transition-all cursor-pointer group ${
                isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#C5A059] border-[#C5A059]'
                    : 'border-white/20 group-hover:border-white/40'
                }`}>
                  {isSelected && <Check size={12} className="text-black" strokeWidth={3} />}
                </div>
                <span className={`text-[15px] font-medium transition-colors ${
                  isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                }`}>
                  {service.name}
                </span>
              </div>
              <span className={`text-[15px] font-medium tabular-nums ${
                isSelected ? 'text-[#C5A059]' : 'text-zinc-500'
              }`}>
                R$ {Number(service.price).toFixed(0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Total + Continue */}
      <div className="pt-4 border-t border-white/[0.04] space-y-3">
        {selectedServices.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider">Total</span>
            <span className="text-xl font-bold text-[#C5A059]">R$ {totalPrice.toFixed(0)}</span>
          </div>
        )}

        <div className="flex gap-3">
          {isMensalista && (
            <button
              type="button"
              onClick={onNextStep}
              className="px-8 py-4 bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[13px] font-medium rounded-xl hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer"
            >
              Pular
            </button>
          )}
          <button
            type="button"
            onClick={onNextStep}
            disabled={!isMensalista && selectedServices.length === 0}
            className="flex-1 py-4 bg-[#C5A059] text-black text-[13px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/20 hover:shadow-xl hover:shadow-[#C5A059]/30"
          >
            Continuar
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
