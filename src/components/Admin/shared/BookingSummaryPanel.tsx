import React from 'react';
import type { Service, Client } from '../../../types';

interface BookingSummaryPanelProps {
  selectedClient: Client | null;
  newClient: { name: string; phone: string };
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  totalPrice: number;
}

const BookingSummaryPanel: React.FC<BookingSummaryPanelProps> = ({
  selectedClient,
  newClient,
  selectedServices,
  selectedDate,
  selectedTime,
  totalPrice
}) => {
  return (
    <div className="lg:col-span-5 xl:col-span-4 sticky top-28">
      <div className="bg-[#0C0C0C]/85 backdrop-blur-xl border border-white/[0.05] p-8 flex flex-col justify-between min-h-[580px] shadow-2xl relative">
        <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-[#C5A059]/50 to-transparent" />

        <div className="space-y-8">
          <div className="text-center space-y-1">
            <span className="text-[8px] font-black tracking-[0.6em] text-[#C5A059] uppercase block">BLACK DIAMOND</span>
            <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase italic">Resumo do Agendamento</span>
          </div>

          <div className="space-y-6 pt-4 border-t border-white/[0.03]">
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em] block">Cliente</span>
              {selectedClient || newClient.name ? (
                <p className="text-base font-bold text-white uppercase italic leading-none truncate">
                  {selectedClient ? selectedClient.name : newClient.name}
                </p>
              ) : (
                <p className="text-[10px] font-medium text-zinc-800 uppercase tracking-[0.2em]">—</p>
              )}
            </div>

            <div className="space-y-2 border-t border-white/[0.02] pt-4">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em] block mb-2">Serviços</span>
              {selectedServices.length > 0 ? (
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
                  {selectedServices.map(s => (
                    <div key={`summary-${s.id}`} className="flex justify-between items-center text-sm">
                      <span className="text-zinc-300 font-bold uppercase italic tracking-tight">{s.name}</span>
                      <span className="text-[#C5A059] font-bold italic">R$ {Number(s.price).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-medium text-zinc-800 uppercase tracking-[0.2em]">—</p>
              )}
            </div>

            <div className="border-t border-white/[0.02] pt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em] block mb-1">Data</span>
                <p className={`text-base font-bold italic leading-none ${selectedTime ? 'text-white' : 'text-zinc-600'}`}>
                  {selectedTime ? selectedDate.split('-').reverse().join('/') : '--/--'}
                </p>
              </div>
              <div>
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em] block mb-1">Horário</span>
                <p className={`text-base font-bold italic leading-none ${selectedTime ? 'text-[#C5A059]' : 'text-zinc-600'}`}>
                  {selectedTime ? selectedTime : '--:--'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.03] space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em] block">TOTAL</span>
            </div>
            <p className="text-3xl font-black text-white italic tracking-tighter leading-none">
              <span className="text-xs font-bold text-[#C5A059] mr-1">R$</span>
              {totalPrice.toFixed(0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSummaryPanel;
