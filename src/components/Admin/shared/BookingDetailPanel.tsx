import React from 'react';
import type { BookingWithClient, Service } from '../../../types';
import WhatsAppReminderButton from './WhatsAppReminderButton';

interface BookingDetailPanelProps {
  booking: BookingWithClient;
  services: Service[];
  onClose: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onDelete: () => void;
}

const BookingDetailPanel: React.FC<BookingDetailPanelProps> = React.memo(({
  booking,
  services,
  onClose,
  onComplete,
  onReschedule,
  onDelete,
}) => {
  return (
    <>
      <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
        <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em]">Dados do Agendamento</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="px-6 py-6 space-y-6 flex-1 text-left overflow-y-auto scrollbar-hide">
        {/* Client Info */}
        <div className="flex items-center gap-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
          <div className="w-12 h-12 bg-[#111111] border border-black rounded-xl flex items-center justify-center text-lg font-bold text-zinc-500 uppercase shrink-0">
            {booking.clients?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-white uppercase tracking-tight truncate">{booking.clients?.name}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{booking.clients?.phone || 'Sem telefone'}</p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-[#121212] border border-white/[0.03] rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Data</span>
            <span className="text-xs font-bold text-white uppercase">
              {new Date(booking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Horário</span>
            <span className="text-xs font-bold text-[#C5A059]">{booking.booking_time?.slice(0, 5)}</span>
          </div>
        </div>

        {/* Services */}
        {booking.service_ids && booking.service_ids.length > 0 && (
          <div className="bg-[#121212] border border-white/[0.03] rounded-xl p-4 space-y-3">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Serviços</span>
            <div className="space-y-2.5">
              {booking.service_ids.map((id: string) => {
                const srv = services.find(s => s.id === id);
                return (
                  <div key={id} className="flex justify-between items-center text-sm px-1">
                    <span className="text-zinc-400 font-medium">{srv?.name || 'Serviço'}</span>
                    <span className="font-bold text-white tabular-nums">R$ {Number(srv?.price || 0).toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Investimento Total</span>
              <span className="text-base font-black text-[#C5A059]">R$ {(booking.total_price || 0).toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {booking.status !== 'completed' && (
            <button
              onClick={() => { onComplete(); onClose(); }}
              className="w-full h-11 bg-[#C5A059] hover:bg-white text-[#0A0A0A] font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 rounded-xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mb-0.5"><polyline points="20 6 9 17 4 12"/></svg>
              Concluir Atendimento
            </button>
          )}
          {booking.clients?.phone && (
            <WhatsAppReminderButton
              booking={booking}
              className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.05] hover:text-white rounded-xl transition-all active:scale-[0.99] text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
              showLabel
              label="Enviar lembrete"
              iconType="bell"
            />
          )}
          <button
            onClick={onReschedule}
            className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.05] hover:text-white rounded-xl transition-all active:scale-[0.99] text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            Reagendar
          </button>
          <button
            onClick={onDelete}
            className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-400 hover:bg-red-500/[0.02] hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all active:scale-[0.99] text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mb-0.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Excluir Agendamento
          </button>
        </div>
      </div>
    </>
  );
});

BookingDetailPanel.displayName = 'BookingDetailPanel';

export default BookingDetailPanel;
