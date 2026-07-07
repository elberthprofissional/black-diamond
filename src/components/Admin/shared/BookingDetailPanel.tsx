import React from 'react';
import type { BookingWithClient, Service } from '../../../types';
import { formatPhone } from '../../../lib/utils';

interface BookingDetailPanelProps {
  booking: BookingWithClient;
  services: Service[];
  onClose: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onDelete: () => void;
  onUnblock?: () => void;
}

const XIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BookingDetailPanel: React.FC<BookingDetailPanelProps> = React.memo(
  ({ booking, services, onClose, onComplete, onReschedule, onDelete, onUnblock }) => {
    const isBlocked =
      booking.is_blocked || !booking.client_id || booking.clients?.name === 'BLOQUEADO';

    if (isBlocked) {
      return (
        <>
          <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-5 lg:px-6 py-3.5 lg:py-4 border-b border-white/[0.04] flex items-center justify-between">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em]">
              Horário Bloqueado
            </span>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
            >
              <XIcon />
            </button>
          </div>
          <div className="px-5 lg:px-6 py-5 lg:py-6 flex-1 text-left overflow-y-auto scrollbar-hide">
            {/* Mobile: minimal */}
            <div className="lg:hidden space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#C5A059]/10">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#C5A059"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white">Horário Bloqueado</h3>
                  <p className="text-[11px] text-zinc-500">Não aceita agendamentos</p>
                </div>
              </div>
              <button
                onClick={() => {
                  onUnblock?.();
                  onClose();
                }}
                className="w-full h-10 bg-[#C5A059]/10 text-[#C5A059] font-bold text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer rounded-xl"
              >
                Desbloquear
              </button>
            </div>
            {/* Desktop: with cards */}
            <div className="hidden lg:block space-y-6">
              <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl">
                <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center shrink-0">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#C5A059"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Horário Indisponível</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Este horário foi bloqueado e não aceita agendamentos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onUnblock?.();
                  onClose();
                }}
                className="w-full h-11 bg-[#C5A059]/10 border border-[#C5A059]/20 hover:bg-[#C5A059]/20 text-[#C5A059] font-black text-[10px] uppercase tracking-[0.25em] transition-all cursor-pointer flex items-center justify-center gap-2 rounded-xl"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
                Desbloquear Horário
              </button>
            </div>
          </div>
        </>
      );
    }

    const dateStr = new Date(booking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
    const timeStr = booking.booking_time?.slice(0, 5) || '--:--';

    return (
      <>
        <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-5 lg:px-6 py-3.5 lg:py-4 border-b border-white/[0.04] flex items-center justify-between">
          <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em]">
            Dados do Agendamento
          </span>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
          >
            <XIcon />
          </button>
        </div>

        {/* ==================== MOBILE: minimal ==================== */}
        <div className="lg:hidden px-5 py-5 flex-1 text-left overflow-y-auto scrollbar-hide space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-white/[0.06] shrink-0">
              {booking.clients?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-white truncate">{booking.clients?.name}</p>
              <p className="text-[12px] text-zinc-500">
                {formatPhone(booking.clients?.phone) || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[13px]">
            <span className="text-zinc-400">{dateStr}</span>
            <span className="text-[#C5A059] font-bold">{timeStr}</span>
          </div>

          <div className="h-px bg-white/[0.04]" />

          {booking.service_ids && booking.service_ids.length > 0 && (
            <div className="space-y-2.5">
              {booking.service_ids.map((id: string) => {
                const srv = services.find((s) => s.id === id);
                return (
                  <div key={id} className="flex justify-between items-center">
                    <span className="text-[13px] text-zinc-400">{srv?.name || 'Serviço'}</span>
                    <span className="text-[13px] font-semibold text-zinc-300 tabular-nums">
                      R$ {Number(srv?.price || 0).toFixed(0)}
                    </span>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  Total
                </span>
                <span className="text-[15px] font-black text-[#C5A059]">
                  R$ {(booking.total_price || 0).toFixed(0)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2">
            {booking.status !== 'completed' && (
              <button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="w-full h-11 bg-[#C5A059] text-[#0A0A0A] font-black text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-2 rounded-xl"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="mb-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Finalizar Atendimento
              </button>
            )}
            <button
              onClick={onReschedule}
              className="w-full h-9 bg-transparent text-zinc-400 hover:text-white transition-all text-[9px] font-bold uppercase tracking-[0.15em] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
              Reagendar
            </button>
            <button
              onClick={onDelete}
              className="w-full h-9 bg-transparent text-red-400/40 hover:text-red-400/70 transition-all text-[9px] font-bold uppercase tracking-[0.15em] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Cancelar Agendamento
            </button>
          </div>
        </div>

        {/* ==================== DESKTOP: with cards ==================== */}
        <div className="hidden lg:block px-6 py-6 flex-1 text-left overflow-y-auto scrollbar-hide space-y-6">
          <div className="flex items-center gap-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
            <div className="w-12 h-12 bg-[#111111] border border-white/[0.08] rounded-xl flex items-center justify-center text-lg font-bold text-white uppercase shrink-0">
              {booking.clients?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-white uppercase tracking-tight truncate">
                {booking.clients?.name}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatPhone(booking.clients?.phone) || 'Sem telefone'}
              </p>
            </div>
          </div>

          <div className="bg-[#121212] border border-white/[0.03] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Data
              </span>
              <span className="text-xs font-bold text-white uppercase">{dateStr}</span>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Horário
              </span>
              <span className="text-xs font-bold text-[#C5A059]">{timeStr}</span>
            </div>
          </div>

          {booking.service_ids && booking.service_ids.length > 0 && (
            <div className="bg-[#121212] border border-white/[0.03] rounded-xl p-4 space-y-3">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block px-1">
                Serviços
              </span>
              <div className="space-y-2.5">
                {booking.service_ids.map((id: string) => {
                  const srv = services.find((s) => s.id === id);
                  return (
                    <div key={id} className="flex justify-between items-center text-sm px-1">
                      <span className="text-zinc-400 font-medium">{srv?.name || 'Serviço'}</span>
                      <span className="font-bold text-white tabular-nums">
                        R$ {Number(srv?.price || 0).toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="h-px bg-white/[0.04]" />
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                  Total
                </span>
                <span className="text-base font-black text-[#C5A059]">
                  R$ {(booking.total_price || 0).toFixed(0)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {booking.status !== 'completed' && (
              <button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="w-full h-11 bg-[#C5A059] hover:bg-white text-[#0A0A0A] font-black text-[10px] uppercase tracking-[0.25em] transition-all cursor-pointer flex items-center justify-center gap-2 rounded-xl"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="mb-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Finalizar Atendimento
              </button>
            )}
            <button
              onClick={onReschedule}
              className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.05] hover:text-white rounded-xl transition-all active:scale-[0.99] text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
              Reagendar
            </button>
            <button
              onClick={onDelete}
              className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-400 hover:bg-red-500/[0.02] hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all active:scale-[0.99] text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="mb-0.5"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Cancelar Agendamento
            </button>
          </div>
        </div>
      </>
    );
  }
);

BookingDetailPanel.displayName = 'BookingDetailPanel';

export default BookingDetailPanel;
