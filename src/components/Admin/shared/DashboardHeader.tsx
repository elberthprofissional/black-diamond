import { type FC } from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { formatDisplayName } from '../../../lib/utils';
import type { BookingWithClient } from '../../../types';

interface DashboardHeaderProps {
  nextBooking: BookingWithClient | null;
  dailyRevenue: number;
  onSelectNext: () => void;
  realtimeStatus?: 'connected' | 'disconnected' | 'checking';
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const DashboardHeader: FC<DashboardHeaderProps> = ({
  nextBooking,
  dailyRevenue,
  onSelectNext,
  realtimeStatus,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <>
      <div className="hidden lg:flex items-center justify-between gap-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase italic">
            Agenda do Dia
          </h1>
          {/* Realtime status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.04]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                realtimeStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                  : realtimeStatus === 'disconnected'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
              }`}
            />
            <span
              className={`text-[8px] font-bold uppercase tracking-wider ${
                realtimeStatus === 'connected'
                  ? 'text-emerald-400'
                  : realtimeStatus === 'disconnected'
                    ? 'text-red-400'
                    : 'text-amber-400'
              }`}
            >
              {realtimeStatus === 'connected'
                ? 'Ao vivo'
                : realtimeStatus === 'disconnected'
                  ? 'Offline'
                  : '...'}
            </span>
          </div>
          {/* Desktop: Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Atualizar"
            className="p-2 rounded-lg text-zinc-600 hover:text-[#C5A059] hover:bg-white/[0.04] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Mobile: Realtime status + Refresh */}
        <div className="lg:hidden flex items-center gap-2">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.04] ${
              realtimeStatus === 'connected' ? '' : ''
            }`}
          >
            <span
              className={`w-1 h-1 rounded-full ${
                realtimeStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : realtimeStatus === 'disconnected'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
              }`}
            />
            <span className="text-[6px] font-bold uppercase tracking-wider text-zinc-500">
              {realtimeStatus === 'connected'
                ? 'AO VIVO'
                : realtimeStatus === 'disconnected'
                  ? 'OFF'
                  : '...'}
            </span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Atualizar"
            className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
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
                  {formatDisplayName(nextBooking.clients?.name) ?? ''}
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
        <div className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex flex-col items-start min-w-[110px]">
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
            Lucro do Dia
          </span>
          {dailyRevenue > 0 ? (
            <span className="text-sm font-black text-[#C5A059] tabular-nums">
              R$ {dailyRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-zinc-600 flex items-center gap-1.5 mt-0.5">
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
