import { memo, type FC } from 'react';
import type { BookingWithClient } from '../../../types';

interface BlockedPanelProps {
  blockedBookings: BookingWithClient[];
  blockingDay: boolean;
  onUnblock: (booking: BookingWithClient) => void;
  onUnblockDay: () => void;
}

const BlockedPanel: FC<BlockedPanelProps> = ({
  blockedBookings,
  blockingDay,
  onUnblock,
  onUnblockDay,
}) => {
  if (blockedBookings.length === 0) {
    return (
      <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">
        Nenhum horário bloqueado
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onUnblockDay}
        disabled={blockingDay}
        className="group w-full mb-4 py-3.5 px-4 bg-white/[0.02] hover:bg-emerald-500/[0.06] border border-white/[0.06] hover:border-emerald-500/20 text-zinc-400 hover:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {blockingDay ? (
          <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        )}
        Liberar Dia Inteiro
      </button>
      {blockedBookings.map((booking) => (
        <div
          key={`blocked-${booking.id}`}
          className="flex items-center bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3"
        >
          <span className="text-sm font-black text-zinc-500 tabular-nums w-12 shrink-0">
            {booking.booking_time.slice(0, 5)}
          </span>
          <div className="w-px h-4 bg-white/[0.08] mx-3 shrink-0" />
          <div className="flex-1 flex items-center justify-end">
            <button
              onClick={() => onUnblock(booking)}
              aria-label={`Desbloquear horario ${booking.booking_time.slice(0, 5)}`}
              className="text-[10px] font-black uppercase tracking-[0.15em] text-red-400/70 hover:text-red-400 transition-colors cursor-pointer"
            >
              Desbloquear
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(BlockedPanel);
