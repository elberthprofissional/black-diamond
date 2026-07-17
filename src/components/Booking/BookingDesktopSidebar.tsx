import { type FC } from 'react';
import { formatDateBR } from '../../lib/utils';
import type { Service } from '../../types';

interface BookingDesktopSidebarProps {
  isMensalista: boolean;
  selectedServices: Service[];
  step: number;
  selectedDate: string;
  selectedTime: string;
  totalPrice: number;
  planName?: string;
}

const BookingDesktopSidebar: FC<BookingDesktopSidebarProps> = ({
  isMensalista,
  selectedServices,
  step,
  selectedDate,
  selectedTime,
  totalPrice,
  planName,
}) => {
  return (
    <div className="w-[420px] shrink-0 bg-[#0A0A0A] flex flex-col justify-between p-12 text-white relative overflow-hidden">
      <img
        src="/assets/agendamento.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 pointer-events-none"
        aria-hidden="true"
      />
      <div>
        <span className="text-[10px] font-black tracking-[0.5em] text-[#D4AF37] uppercase">
          BLACK DIAMOND
        </span>
        <h1 className="text-3xl font-bold mt-6 leading-tight">
          Agendamento
          <br />
          Online
        </h1>
        <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
          Escolha seus serviços, horário e confirme. Rápido e fácil.
        </p>
        {isMensalista && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">
              {planName || 'Mensalista'}
            </span>
          </div>
        )}
      </div>
      <div className="mt-auto">
        {selectedServices.length > 0 && step < 4 && (
          <div className="bg-white/[0.04] rounded-2xl p-5 space-y-3 border border-white/[0.06]">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Resumo</p>
            {selectedServices.map((s) => (
              <div key={`side-${s.id}`} className="flex justify-between items-center">
                <span className="text-[13px] text-zinc-300">{s.name}</span>
                <span className="text-[13px] font-bold text-[#D4AF37]">
                  R$ {Number(s.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            {selectedDate && (
              <div className="border-t border-white/[0.06] pt-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] text-zinc-500">Data</span>
                  <span className="text-[13px] font-bold">{formatDateBR(selectedDate)}</span>
                </div>
                {selectedTime && (
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-500">Horário</span>
                    <span className="text-[13px] font-bold text-[#D4AF37]">{selectedTime}</span>
                  </div>
                )}
              </div>
            )}
            <div className="border-t border-white/[0.06] pt-3 flex justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Total</span>
              <span className="text-lg font-bold">
                R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="bg-white/[0.04] rounded-2xl p-5 space-y-3 border border-white/[0.06]">
            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
              Procedimento
            </p>
            <p className="text-[12px] text-zinc-400 leading-relaxed">
              Você será redirecionado para o WhatsApp com a mensagem do seu agendamento já
              formatada. Basta enviar a mensagem na conversa para finalizar.
            </p>
          </div>
        )}
        <p className="text-[8px] text-zinc-600 mt-6">Precisa de ajuda? WhatsApp</p>
      </div>
    </div>
  );
};

export default BookingDesktopSidebar;
