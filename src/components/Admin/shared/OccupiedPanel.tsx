import { memo, type FC } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { formatDisplayName } from '../../../lib/utils';
import type { BookingWithClient } from '../../../types';

interface OccupiedPanelProps {
  bookings: BookingWithClient[];
  selectedId: string | null;
  onSelect: (booking: BookingWithClient) => void;
  onComplete: (booking: BookingWithClient) => void;
}

const OccupiedPanel: FC<OccupiedPanelProps> = ({ bookings, selectedId, onSelect, onComplete }) => {
  if (bookings.length === 0) {
    return (
      <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">
        Nenhum agendamento
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className={`w-full flex items-center rounded-lg border cursor-pointer transition-all group ${selectedId === booking.id ? 'border-[#C5A059]/40 bg-[#C5A059]/5' : 'border-white/5 bg-[#111111] hover:border-white/10'}`}
        >
          <div
            onClick={() => onSelect(booking)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(booking);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Agendamento às ${booking.booking_time.slice(0, 5)} com ${booking.clients?.name}`}
            className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]/50 rounded"
          >
            <span className="text-sm font-bold text-zinc-500 tabular-nums w-10 shrink-0">
              {booking.booking_time.slice(0, 5)}
            </span>
            <div className="w-px h-3.5 bg-white/10 shrink-0" />
            <span className="text-[11px] font-medium text-zinc-200 truncate">
              {formatDisplayName(booking.clients?.name)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete(booking);
            }}
            className="p-2.5 text-zinc-500 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
            aria-label="Concluir atendimento"
          >
            <Check size={15} strokeWidth={2.5} />
          </button>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 mr-1" />
        </div>
      ))}
    </div>
  );
};

export default memo(OccupiedPanel);
