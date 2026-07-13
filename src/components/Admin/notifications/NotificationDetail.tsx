import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  X as XIcon,
  CalendarDays,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { type Notification } from '../../../hooks/useNotifications';
import { WhatsAppIcon } from '../../WhatsAppIcon';
import { formatPhone } from '../../../lib/utils';
import { parseNotifBody } from '../../../lib/notifications';

interface NotificationDetailProps {
  notif: Notification;
  onBack: () => void;
  onClose?: () => void;
}

export default function NotificationDetail({ notif, onBack, onClose }: NotificationDetailProps) {
  const navigate = useNavigate();
  const data = parseNotifBody(notif.body);
  if (!data) return null;

  const isCancelled = notif.tag?.startsWith('cancelled-') || data.manageUrl === 'Cancelado';
  const [date, timeRaw] = data.dateTime.split(' às ');
  const services = data.services.split(', ');

  const openWhatsApp = (msg: string) => {
    window.open(`https://wa.me/${data.clientPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04] shrink-0">
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
          {isCancelled ? 'Cancelado' : 'Agendamento'}
        </span>
        <button
          onClick={onBack}
          className="ml-auto text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <XIcon size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="flex items-center gap-3 px-4 py-3.5 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-red-400">Agendamento Cancelado</p>
              <p className="text-[11px] text-red-400/60">Este agendamento não está mais ativo.</p>
            </div>
          </div>
        )}

        {/* Client */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0">
              {data.clientName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-white truncate">{data.clientName}</p>
              <p className="text-[12px] text-zinc-500 tabular-nums">
                {formatPhone(data.clientPhone)}
              </p>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <CalendarDays size={16} className="text-zinc-500 shrink-0" />
            <span className="text-[13px] text-zinc-300">{date}</span>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#C5A059]/[0.06] border border-[#C5A059]/15 rounded-xl">
            <Clock size={16} className="text-[#C5A059] shrink-0" />
            <span className="text-[13px] text-[#C5A059] font-bold">{timeRaw}</span>
          </div>
        </div>

        {/* Services */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-3">
            Serviços ({services.length})
          </span>
          <div className="space-y-2">
            {services.map((s: string, i: number) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]/50 shrink-0" />
                <span className="text-[13px] text-zinc-300">{s}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-white/[0.04] my-3" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Total
            </span>
            <span className="text-[18px] font-black text-[#C5A059] tabular-nums">
              {data.totalPrice}
            </span>
          </div>
        </div>

        {/* Actions */}
        {isCancelled ? (
          <button
            onClick={() => window.open(`https://wa.me/${data.clientPhone}`, '_blank')}
            className="w-full h-11 bg-white/[0.04] border border-white/[0.06] text-zinc-300 hover:bg-white/[0.06] hover:text-white rounded-xl transition-all text-[11px] font-bold uppercase tracking-[0.12em] cursor-pointer flex items-center justify-center gap-2"
          >
            <Send size={14} /> Falar com Cliente
          </button>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={() =>
                openWhatsApp(
                  `✅ *Agendamento confirmado, ${data.clientName}!*\n\nNa *Black Diamond*\n\n✂️ ${data.services}\n📅 ${data.dateTime}\n💰 ${data.totalPrice}\n\n🔗 *Para cancelar ou reagendar:*\n${data.manageUrl}\n\nAguardamos você! 💈`
                )
              }
              className="w-full h-11 bg-[#C5A059] text-black hover:bg-[#A68233] font-bold text-[11px] uppercase tracking-[0.12em] transition-all cursor-pointer flex items-center justify-center gap-2 rounded-xl active:scale-[0.98]"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Enviar Lembrete
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  onClose?.();
                  navigate('/cancelar', { state: { phone: data.clientPhone } });
                }}
                className="h-10 bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-white rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowUpRight size={14} /> Reagendar
              </button>
              <button
                onClick={() => {
                  onClose?.();
                  navigate('/cancelar', { state: { phone: data.clientPhone } });
                }}
                className="h-10 bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-red-500/[0.03] hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
              >
                <XIcon size={14} /> Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
