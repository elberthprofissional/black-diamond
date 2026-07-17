import { RefreshCw } from 'lucide-react';
import { formatDisplayName } from '../../../lib/utils';
import type { BookingWithClient } from '../../../types';

interface RescheduleBannerProps {
  booking: BookingWithClient;
}

export default function RescheduleBanner({ booking }: RescheduleBannerProps) {
  return (
    <div className="col-span-12 p-4 bg-[#D4AF37]/[0.08] border border-[#D4AF37]/30 rounded-2xl flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
          <RefreshCw size={18} />
        </div>
        <div>
          <span className="text-[9px] font-black text-[#D4AF37] tracking-[0.2em] uppercase block">
            Modo Reagendamento
          </span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            Reagendando o cliente{' '}
            <span className="text-[#D4AF37]">{formatDisplayName(booking.clients?.name)}</span>
          </h3>
        </div>
      </div>
      <div className="text-right">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
          Original
        </span>
        <span className="text-xs font-bold text-zinc-300">
          {new Date(booking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}{' '}
          às {booking.booking_time.slice(0, 5)}
        </span>
      </div>
    </div>
  );
}
