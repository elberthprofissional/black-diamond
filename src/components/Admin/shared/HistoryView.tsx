import { EyeOff, RotateCcw } from 'lucide-react';
import { formatPricePublic } from '../../../lib/utils';
import type { BookingWithClient, Service } from '../../../types';

interface HistoryViewProps {
  filteredBookings: BookingWithClient[];
  visibleBookings: BookingWithClient[];
  hiddenIds: string[];
  services: Service[];
  historyFilter: string;
  availableMonths: string[];
  historyMonth: string;
  hasMore: boolean;
  remaining: number;
  onFilterChange: (filter: string) => void;
  onMonthChange: (month: string) => void;
  onToggleHide: (bookingId: string) => void;
  onLoadMore: () => void;
  formatMonth: (key: string) => string;
}

export default function HistoryView({
  filteredBookings,
  visibleBookings,
  hiddenIds,
  services,
  historyFilter,
  availableMonths,
  historyMonth,
  hasMore,
  remaining,
  onFilterChange,
  onMonthChange,
  onToggleHide,
  onLoadMore,
  formatMonth,
}: HistoryViewProps) {
  const getServiceNames = (serviceIds: string[]) => {
    return (
      serviceIds
        .map((id) => services.find((s) => s.id === id)?.name)
        .filter(Boolean)
        .join(', ') || 'Serviço'
    );
  };

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'completed', label: 'Concluídos' },
            { key: 'cancelled', label: 'Cancelados' },
            { key: 'hidden', label: 'Ocultos', icon: EyeOff },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                historyFilter === f.key
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {f.icon && <f.icon size={10} />}
              {f.label}
            </button>
          ))}
        </div>
        {availableMonths.length > 1 && (
          <select
            value={historyMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 outline-none cursor-pointer appearance-none"
          >
            <option value="all">Todos os meses</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-3">
        {filteredBookings.length} {filteredBookings.length === 1 ? 'agendamento' : 'agendamentos'}
        {historyFilter === 'hidden' && ' ocultos'}
      </p>

      {visibleBookings.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-8">
          {historyFilter === 'hidden'
            ? 'Nenhum agendamento oculto.'
            : 'Nenhum agendamento encontrado.'}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleBookings.map((booking) => {
            const date = new Date(booking.booking_date + 'T12:00:00');
            const isHidden = hiddenIds.includes(booking.id);
            const statusColor =
              booking.status === 'completed'
                ? 'text-emerald-400'
                : booking.status === 'cancelled'
                  ? 'text-red-400'
                  : booking.status === 'confirmed'
                    ? 'text-[#D4AF37]'
                    : 'text-zinc-400';
            const statusLabel =
              booking.status === 'completed'
                ? 'Concluído'
                : booking.status === 'cancelled'
                  ? 'Cancelado'
                  : booking.status === 'confirmed'
                    ? 'Confirmado'
                    : 'Pendente';
            return (
              <div
                key={booking.id}
                className={`bg-[#121212] border rounded-xl p-4 space-y-2 transition-all ${
                  isHidden ? 'border-red-500/20 opacity-50' : 'border-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    {date.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#D4AF37]">
                      {formatPricePublic(Number(booking.total_price))}
                    </span>
                    <button
                      onClick={() => onToggleHide(booking.id)}
                      className={`p-1 rounded-md transition-all cursor-pointer ${
                        isHidden
                          ? 'text-emerald-400 hover:text-emerald-300'
                          : 'text-zinc-600 hover:text-red-400'
                      }`}
                      aria-label={isHidden ? 'Mostrar agendamento' : 'Ocultar agendamento'}
                      title={isHidden ? 'Restaurar' : 'Ocultar do histórico'}
                    >
                      {isHidden ? <RotateCcw size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">
                    {booking.service_ids?.length > 0
                      ? getServiceNames(booking.service_ids)
                      : 'Serviço'}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-600">
                  {booking.booking_time?.slice(0, 5)}
                  {booking.total_duration ? ` · ${booking.total_duration}min` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button
          onClick={onLoadMore}
          className="w-full py-3 mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white border border-white/[0.06] rounded-xl hover:bg-white/[0.02] transition-all cursor-pointer"
        >
          Carregar mais ({remaining} restantes)
        </button>
      )}
    </>
  );
}
