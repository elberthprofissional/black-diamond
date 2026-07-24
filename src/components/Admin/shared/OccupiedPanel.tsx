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
    <div className="space-y-3">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className={`w-full flex items-center rounded-xl border cursor-pointer transition-all duration-200 group ${
            selectedId === booking.id
              ? 'border-[#D4AF37]/40 bg-[#D4AF37]/[0.06]'
              : 'border-white/[0.06] bg-[#111] hover:border-white/[0.1]'
          }`}
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
            aria-label={`Agendamento as ${booking.booking_time.slice(0, 5)} com ${booking.clients?.name}`}
            className="flex-1 flex items-center gap-4 px-4 py-3.5 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 rounded-xl"
          >
            <span className="text-sm font-black text-[#D4AF37] tabular-nums w-12 shrink-0">
              {booking.booking_time.slice(0, 5)}
            </span>
            <div className="w-px h-4 bg-white/[0.08] shrink-0" />
            <span className="text-[13px] font-semibold text-zinc-200 truncate">
              {formatDisplayName(booking.clients?.name)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete(booking);
            }}
            className="p-3 text-zinc-600 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
            aria-label="Concluir atendimento"
          >
            <Check size={16} strokeWidth={2.5} />
          </button>
          <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0 mr-2" />
        </div>
      ))}
    </div>
  );
};

export default memo(OccupiedPanel);
