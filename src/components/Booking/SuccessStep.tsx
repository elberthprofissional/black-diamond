import React from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Service } from '../../types';

interface SuccessStepProps {
  selectedDate: string;
  selectedTime: string;
  totalPrice: number;
  selectedServices: Service[];
  clientName: string;
  layout: 'desktop' | 'mobile';
}

const SuccessStep: React.FC<SuccessStepProps> = ({ selectedDate, selectedTime, totalPrice, layout }) => {
  const navigate = useNavigate();
  const formattedDate = selectedDate.split('-').reverse().join('/');

  if (layout === 'desktop') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto mb-8">
          <Check size={36} className="text-[#C5A059]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Agendamento confirmado!</h2>
        <p className="text-base text-zinc-500 mb-8">Seu horário foi reservado com sucesso.</p>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-3 w-full max-w-sm mb-16 text-left">
          <div className="flex justify-between">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Data</span>
            <span className="text-sm font-bold text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Horário</span>
            <span className="text-sm font-bold text-[#C5A059]">{selectedTime}</span>
          </div>
          <div className="flex justify-between border-t border-white/[0.06] pt-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</span>
            <span className="text-sm font-bold text-white">R$ {totalPrice.toFixed(0)}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          aria-label="Voltar para a página inicial"
          className="h-12 px-10 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all cursor-pointer"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#050505] z-[200] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm space-y-8">
        <div className="w-16 h-16 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center mx-auto">
          <Check size={28} className="text-[#C5A059]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Agendamento confirmado!</h2>
          <p className="text-sm text-zinc-500">Seu horário foi reservado com sucesso.</p>
        </div>

        <div className="bg-[#111111] border border-white/[0.04] rounded-xl p-5 space-y-3 text-left mb-12">
          <div className="flex justify-between">
            <span className="text-[10px] text-zinc-500 uppercase">Data</span>
            <span className="text-xs font-bold text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-zinc-500 uppercase">Horário</span>
            <span className="text-xs font-bold text-[#C5A059]">{selectedTime}</span>
          </div>
          <div className="flex justify-between border-t border-white/[0.04] pt-2">
            <span className="text-[10px] text-zinc-500 uppercase">Total</span>
            <span className="text-sm font-bold text-white">R$ {totalPrice.toFixed(0)}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          aria-label="Voltar para a página inicial"
          className="w-full h-12 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all cursor-pointer"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
};

export default SuccessStep;
