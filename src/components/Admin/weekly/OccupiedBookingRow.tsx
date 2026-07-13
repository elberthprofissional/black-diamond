import { type FC, type MouseEvent } from 'react';
import { formatDisplayName } from '../../../lib/utils';
import type { BookingWithClient, Service } from '../../../types';

interface OccupiedBookingRowProps {
  booking: BookingWithClient;
  services: Service[];
  onSelect: (booking: BookingWithClient) => void;
}

const OccupiedBookingRow: FC<OccupiedBookingRowProps> = ({ booking, services, onSelect }) => {
  const handleReminder = (e: MouseEvent) => {
    e.stopPropagation();
    const phone = booking.clients?.phone?.replace(/\D/g, '') || '';
    const name = booking.clients?.name || '';
    const serviceNames =
      booking.service_ids
        ?.map((id) => services.find((s) => s.id === id)?.name)
        .filter(Boolean)
        .join(', ') || '';
    const date = booking.booking_date;
    const time = booking.booking_time.slice(0, 5);
    const msg = `✅ *Agendamento confirmado, ${name}!*\n\nNa *Black Diamond*\n\n✂️ ${serviceNames}\n📅 ${date} às ${time}\n\nAguardamos você! 💈`;
    const waPhone = phone.startsWith('55') ? phone : `55${phone}`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex items-center bg-[#111111] border border-white/5 rounded-lg px-3 py-2 transition-all hover:border-[#C5A059]/20 group">
      <button
        onClick={() => onSelect(booking)}
        aria-label={`Agendamento às ${booking.booking_time.slice(0, 5)} com ${booking.clients?.name}`}
        className="flex items-center flex-1 min-w-0 text-left cursor-pointer"
      >
        <span className="text-sm font-bold text-white tabular-nums w-12 shrink-0">
          {booking.booking_time.slice(0, 5)}
        </span>
        <div className="w-px h-3.5 bg-white/[0.06] mx-3 shrink-0" />
        <span className="text-[11px] font-bold text-zinc-300 truncate flex-1">
          {formatDisplayName(booking.clients?.name)}
        </span>
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleReminder}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#C5A059]/10 hover:bg-[#C5A059]/20 text-[#C5A059] text-[9px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Lembrete
        </button>

        <button
          onClick={handleReminder}
          className="lg:hidden p-1.5 text-zinc-600 hover:text-[#C5A059] transition-colors cursor-pointer"
          aria-label="Enviar lembrete"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        <button
          onClick={() => onSelect(booking)}
          className="p-1 text-zinc-600 hover:text-[#C5A059] transition-colors cursor-pointer"
          aria-label="Ver detalhes"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default OccupiedBookingRow;
