import { type FC } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatDisplayName } from '../../../lib/utils';
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
      <div className="flex items-stretch gap-3 lg:gap-4">
        <button
          onClick={onSelectNext}
          className="flex-1 bg-[#111111] border border-white/5 py-3 px-3.5 lg:py-4 lg:px-5 rounded-2xl flex items-center gap-3 lg:gap-4 min-w-0 group hover:border-[#C5A059]/20 hover:bg-white/[0.01] transition-all cursor-pointer"
        >
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-[8px] lg:text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
              Próximo Cliente
            </span>
            {nextBooking ? (
              <div className="flex items-baseline gap-2 lg:gap-3 mt-0.5 lg:mt-1 min-w-0">
                <span className="text-[12px] lg:text-[15px] font-bold text-white uppercase tracking-wide truncate">
                  {formatDisplayName(nextBooking.clients?.name) ?? ''}
                </span>
                <span className="text-[11px] lg:text-[13px] font-semibold text-[#C5A059] tabular-nums shrink-0">
                  {nextBooking.booking_time.slice(0, 5)}
                </span>
              </div>
            ) : (
              <span className="text-[11px] lg:text-[13px] font-medium text-zinc-600 mt-0.5 lg:mt-1">
                Sem cliente para hoje
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-zinc-600 group-hover:text-[#C5A059] transition-colors shrink-0" />
        </button>
        <div className="bg-[#111111] border border-white/5 py-3 px-3.5 lg:py-4 lg:px-5 rounded-2xl flex flex-col items-start min-w-[100px] lg:min-w-[140px]">
          <span className="text-[8px] lg:text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
            Lucro do Dia
          </span>
          {dailyRevenue > 0 ? (
            <span className="text-[14px] lg:text-[18px] font-black text-[#C5A059] tabular-nums mt-0.5 lg:mt-1">
              R$ {dailyRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
          ) : (
            <span className="text-[10px] lg:text-[12px] font-semibold text-zinc-600 flex items-center gap-1.5 mt-0.5 lg:mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" />
              Sem movimento
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardHeader;
