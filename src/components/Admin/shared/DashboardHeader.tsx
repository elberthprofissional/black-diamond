import { type FC } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatDisplayName, formatPrice } from '../../../lib/utils';
import type { BookingWithClient } from '../../../types';

interface DashboardHeaderProps {
  nextBooking: BookingWithClient | null;
  dailyRevenue: number;
  onSelectNext: () => void;
}

const DashboardHeader: FC<DashboardHeaderProps> = ({ nextBooking, dailyRevenue, onSelectNext }) => {
  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={onSelectNext}
          className="flex-1 min-w-0 bg-[#111] border border-white/[0.06] py-3 px-3 sm:py-5 sm:px-6 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4 group hover:border-[#D4AF37]/20 transition-all duration-200 cursor-pointer"
        >
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-[10px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              Proximo Cliente
            </span>
            {nextBooking ? (
              <div className="flex items-baseline gap-2 sm:gap-3 mt-1 sm:mt-1.5 min-w-0">
                <span className="text-[13px] sm:text-[18px] font-bold text-white uppercase tracking-wide truncate">
                  {formatDisplayName(nextBooking.clients?.name) ?? ''}
                </span>
                <span className="text-[11px] sm:text-[16px] font-black text-[#D4AF37] tabular-nums shrink-0">
                  {nextBooking.booking_time.slice(0, 5)}
                </span>
              </div>
            ) : (
              <span className="text-[13px] sm:text-[15px] font-medium text-zinc-600 mt-1 sm:mt-1.5">
                Sem cliente
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700 group-hover:text-[#D4AF37] transition-colors shrink-0" />
        </button>
        <div className="shrink-0 sm:flex-1 bg-[#111] border border-white/[0.06] py-3 px-3 sm:py-5 sm:px-6 rounded-xl sm:rounded-2xl flex flex-col justify-center min-w-0">
          <span className="text-[10px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] whitespace-nowrap">
            Lucro do Dia
          </span>
          {dailyRevenue > 0 ? (
            <span className="text-[13px] sm:text-[20px] font-black text-[#D4AF37] tabular-nums mt-1 sm:mt-1.5">
              {formatPrice(dailyRevenue)}
            </span>
          ) : (
            <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse shrink-0" />
              <span className="text-[10px] sm:text-[13px] font-semibold text-zinc-600">
                Sem movimento
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardHeader;
