import { type FC } from 'react';
import { ChevronRight } from 'lucide-react';
import type { BookingWithClient } from '../../../types';

interface DashboardHeaderProps {
  nextBooking: BookingWithClient | null;
  dailyRevenue: number;
  onSelectNext: () => void;
}

const DashboardHeader: FC<DashboardHeaderProps> = ({ nextBooking, dailyRevenue, onSelectNext }) => {
  return (
    <>
      <div className="hidden lg:flex items-center justify-between gap-4 pb-3 border-b border-white/5">
        <h1 className="text-2xl font-bold tracking-tight text-white uppercase italic">
          Agenda do Dia
        </h1>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
        <button
          onClick={onSelectNext}
          className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex items-center gap-3 min-w-0 group hover:border-[#C5A059]/20 hover:bg-white/[0.01] transition-all cursor-pointer"
        >
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
              Próximo Cliente
            </span>
            {nextBooking ? (
              <div className="flex items-baseline gap-2.5 mt-0.5 min-w-0">
                <span className="text-[13px] font-bold text-white uppercase tracking-wide truncate">
                  {nextBooking.clients?.name ?? ''}
                </span>
                <span className="text-[11px] font-semibold text-[#C5A059] tabular-nums shrink-0">
                  {nextBooking.booking_time.slice(0, 5)}
                </span>
              </div>
            ) : (
              <span className="text-xs font-medium text-zinc-600">Sem cliente para hoje</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#C5A059] transition-colors shrink-0" />
        </button>
        <div className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex flex-col items-start">
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
            Lucro do Dia
          </span>
          <span className="text-sm font-black text-[#C5A059] tabular-nums">
            R$ {dailyRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </>
  );
};

export default DashboardHeader;
