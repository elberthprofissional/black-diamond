import { memo, type FC } from 'react';
import { formatPhone, formatDateBR } from '../../lib/utils';
import type { Service } from '../../types';

interface ReviewStepProps {
  userName: string;
  userPhone: string;
  selectedDate: string;
  selectedTime: string;
  selectedServices: Service[];
  totalPrice: number;
  layout: 'desktop' | 'mobile';
}

const ReviewStep: FC<ReviewStepProps> = memo(
  ({ userName, userPhone, selectedDate, selectedTime, selectedServices, totalPrice, layout }) => {
    const formattedDate = formatDateBR(selectedDate);

    if (layout === 'desktop') {
      return (
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-full max-w-[440px] bg-[#080808] border border-white/[0.04] rounded-2xl p-8 space-y-6">
            <div className="pb-4 border-b border-white/[0.04] flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-[#C5A059] uppercase">
                Resumo do Agendamento
              </span>
              <span className="text-[10px] text-zinc-500 font-medium">Verifique os dados</span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-500 font-medium">Cliente</span>
                <span className="font-semibold text-white truncate max-w-[240px]">{userName}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-500 font-medium">WhatsApp</span>
                <span className="font-semibold text-white">{formatPhone(userPhone)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-500 font-medium">Data e Horário</span>
                <span className="font-semibold text-[#C5A059]">
                  {formattedDate} às {selectedTime}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.04] space-y-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                Serviços
              </span>
              <div className="space-y-2">
                {selectedServices.map((s) => (
                  <div key={`ticket-${s.id}`} className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">{s.name}</span>
                    <span className="font-medium text-white">R$ {Number(s.price).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5 border-t border-white/[0.04] flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Total
              </span>
              <span className="text-2xl font-black text-[#C5A059] tracking-tight">
                R$ {totalPrice.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 pb-4">
        <div className="w-full border border-white/[0.04] rounded-2xl p-6 space-y-5">
          <div className="pb-3 border-b border-white/[0.04]">
            <span className="text-[10px] font-bold tracking-widest text-[#C5A059] uppercase">
              Resumo do Agendamento
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-zinc-500 font-medium">Cliente</span>
              <span className="font-semibold text-white truncate max-w-[180px]">{userName}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-zinc-500 font-medium">WhatsApp</span>
              <span className="font-semibold text-white">{formatPhone(userPhone)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-zinc-500 font-medium">Data</span>
              <span className="font-semibold text-white">{formattedDate}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-zinc-500 font-medium">Horário</span>
              <span className="font-semibold text-[#C5A059]">{selectedTime}</span>
            </div>
          </div>

          <div className="pt-3.5 border-t border-white/[0.04] space-y-2.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
              Serviços
            </span>
            <div className="space-y-2">
              {selectedServices.map((s) => (
                <div key={`m-ticket-${s.id}`} className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">{s.name}</span>
                  <span className="font-medium text-white">R$ {Number(s.price).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.04] flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total</span>
            <span className="text-xl font-black text-[#C5A059] tracking-tight">
              R$ {totalPrice.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

ReviewStep.displayName = 'ReviewStep';

export default ReviewStep;
