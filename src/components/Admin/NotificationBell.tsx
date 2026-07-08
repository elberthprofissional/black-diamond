import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronRight } from 'lucide-react';
import { useNotifications, type Notification } from '../../hooks/useNotifications';
import { WhatsAppIcon } from '../WhatsAppIcon';

function parseNotifBody(body: string) {
  const parts = body.split(' | ');
  if (parts.length < 6) return null;
  return {
    clientName: parts[0].replace(/\s*\[MENSALISTA\]/, '').trim(),
    services: parts[1].trim(),
    dateTime: parts[2].trim(),
    totalPrice: parts[3].trim(),
    clientPhone: parts[4].trim(),
    manageUrl: parts[5].trim(),
  };
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return phone;
}

/* ─── Detail Page ─── */
function NotificationDetail({
  notif,
  onBack,
  onDelete,
}: {
  notif: Notification;
  onBack: () => void;
  onDelete: () => void;
}) {
  const data = parseNotifBody(notif.body);
  if (!data) return null;

  const [date, time] = data.dateTime.split(' às ');

  const handleRemind = () => {
    const msg = `✅ *Agendamento confirmado, ${data.clientName}!*\n\nNa *Black Diamond*\n\n✂️ ${data.services}\n📅 ${data.dateTime}\n💰 ${data.totalPrice}\n\n🔗 *Para cancelar ou reagendar:*\n${data.manageUrl}\n\nAguardamos você! 💈`;
    window.open(`https://wa.me/${data.clientPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header — same style as BookingDetailPanel */}
      <div className="sticky top-0 z-10 bg-[#0E0E0E]/95 backdrop-blur-md border-b border-white/[0.04] px-5 py-3.5 flex items-center justify-between">
        <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em]">
          Detalhes do Agendamento
        </span>
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
        >
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
        </button>
      </div>

      <div className="px-5 py-5 flex-1 text-left overflow-y-auto space-y-5">
        {/* Client */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-white/[0.06] shrink-0">
            {data.clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-white truncate">{data.clientName}</p>
            <p className="text-[12px] text-zinc-500">{formatPhone(data.clientPhone)}</p>
          </div>
        </div>

        {/* Date + Time — inline like BookingDetailPanel */}
        <div className="flex items-center gap-4 text-[13px]">
          <span className="text-zinc-400">{date}</span>
          <span className="text-[#C5A059] font-bold">{time}</span>
        </div>

        <div className="h-px bg-white/[0.04]" />

        {/* Services — list with prices */}
        <div className="space-y-2.5">
          {data.services.split(', ').map((s, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-[13px] text-zinc-400">{s}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Total
            </span>
            <span className="text-[15px] font-black text-[#C5A059]">{data.totalPrice}</span>
          </div>
        </div>

        <div className="h-px bg-white/[0.04]" />

        {/* Actions — same style as BookingDetailPanel */}
        <div className="space-y-2">
          <button
            onClick={handleRemind}
            className="w-full h-11 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-black text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-2 rounded-xl"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Enviar Lembrete
          </button>
          <button
            onClick={() => window.open('/cancelar', '_blank')}
            className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.05] hover:text-white rounded-xl transition-all text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
          >
            Reagendar
          </button>
          <button
            onClick={() => window.open(data.manageUrl, '_blank')}
            className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-400 hover:bg-red-500/[0.02] hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
          >
            Cancelar Agendamento
          </button>
          <button
            onClick={onDelete}
            className="w-full h-9 bg-transparent text-zinc-600 hover:text-red-400 transition-all text-[9px] font-bold uppercase tracking-[0.15em] cursor-pointer flex items-center justify-center gap-1.5"
          >
            Remover notificação
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── List Content ─── */
function NotificationListContent({
  notifications,
  unreadCount,
  markAllAsRead,
  clearNotification,
  onClose,
  hideHeader = false,
}: {
  notifications: Notification[];
  unreadCount: number;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  onClose?: () => void;
  hideHeader?: boolean;
}) {
  const [selected, setSelected] = useState<Notification | null>(null);

  const handleDelete = (id: string) => {
    clearNotification(id);
    setSelected(null);
  };

  if (selected) {
    return (
      <NotificationDetail
        notif={selected}
        onBack={() => setSelected(null)}
        onDelete={() => handleDelete(selected.id)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {!hideHeader && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-base font-bold text-white">Notificações</h2>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-[#C5A059] hover:text-[#A68233] transition-colors cursor-pointer"
              >
                Marcar todas como lidas
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
            <Bell size={28} className="text-zinc-800 mb-2" />
            <p className="text-[12px] text-zinc-600">Nenhuma notificação</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const data = parseNotifBody(notif.body);
            const name = data ? data.clientName : notif.title;
            const time = data ? data.dateTime.split(' às ')[1] : '';
            const services = data ? data.services.split(', ').slice(0, 2).join(', ') : '';
            const extra = data ? data.services.split(', ').length - 2 : 0;

            return (
              <button
                key={notif.id}
                onClick={() => setSelected(notif)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all active:bg-white/[0.03]"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-bold text-zinc-400">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[14px] font-semibold truncate ${notif.read ? 'text-zinc-500' : 'text-white'}`}
                    >
                      {name}
                    </span>
                    {time && (
                      <span className="shrink-0 text-[12px] text-[#C5A059] font-bold tabular-nums">
                        {time}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5 truncate">
                    {services}
                    {extra > 0 ? ` +${extra}` : ''}
                  </p>
                </div>

                {/* Chevron */}
                <ChevronRight size={14} className="shrink-0 text-zinc-700" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── Bell Component ─── */
const NotificationBell: React.FC<{ variant: 'mobile' | 'desktop' }> = ({ variant }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, clearNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (variant !== 'desktop' || !isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      )
        setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, variant]);

  return (
    <>
      {variant === 'desktop' ? (
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all cursor-pointer w-full text-left text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]"
        >
          <Bell size={16} className="text-zinc-600 shrink-0" />
          <span className="text-[11px] font-bold tracking-wide flex-1">Notificações</span>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#C5A059] text-black text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      ) : (
        <button
          onClick={() => navigate('/admin/notificacoes')}
          className="relative w-10 h-10 rounded-full hover:bg-white/[0.06] text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#C5A059] text-black text-[9px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {variant === 'desktop' && (
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[190] bg-black/50"
              />
              <motion.div
                ref={panelRef}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 left-0 bottom-0 z-[200] w-[380px] bg-[#0E0E0E] border-r border-white/[0.06] shadow-2xl"
              >
                <NotificationListContent
                  notifications={notifications}
                  unreadCount={unreadCount}
                  markAllAsRead={markAllAsRead}
                  clearNotification={clearNotification}
                  onClose={() => setIsOpen(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

export { NotificationListContent };
export default NotificationBell;
