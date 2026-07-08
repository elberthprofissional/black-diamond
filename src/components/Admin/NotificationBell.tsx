import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronRight, ArrowLeft, User } from 'lucide-react';
import { useNotifications, type Notification } from '../../hooks/useNotifications';
import { WhatsAppIcon } from '../WhatsAppIcon';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

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

interface NotificationDetailProps {
  notif: Notification;
  onBack: () => void;
  onRemind: () => void;
  onDelete: () => void;
}

function NotificationDetail({ notif, onBack, onRemind, onDelete }: NotificationDetailProps) {
  const data = parseNotifBody(notif.body);
  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.06] shrink-0">
        <button
          onClick={onBack}
          className="flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[15px] font-bold text-white flex-1">Detalhes</h1>
        <button
          onClick={onDelete}
          className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
        >
          Remover
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Client + Info */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
              <User size={18} className="text-[#C5A059]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-white">{data.clientName}</p>
              <p className="text-[11px] text-zinc-500">{formatPhone(data.clientPhone)}</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-white/[0.04]">
            <div className="flex justify-between">
              <span className="text-[12px] text-zinc-500">Data</span>
              <span className="text-[12px] font-semibold text-white">
                {data.dateTime.split(' às ')[0]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[12px] text-zinc-500">Horário</span>
              <span className="text-[12px] font-semibold text-[#C5A059]">
                {data.dateTime.split(' às ')[1]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[12px] text-zinc-500">Total</span>
              <span className="text-[12px] font-bold text-white">{data.totalPrice}</span>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
            Serviços
          </p>
          <div className="space-y-2">
            {data.services.split(', ').map((service, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                <span className="text-[13px] text-zinc-300">{service}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onRemind}
            className="w-full h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Enviar Lembrete</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (data.manageUrl) window.open('/cancelar', '_blank');
              }}
              className="flex-1 h-10 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">Reagendar</span>
            </button>
            <button
              onClick={() => {
                if (data.manageUrl) window.open(data.manageUrl, '_blank');
              }}
              className="flex-1 h-10 rounded-xl border border-red-500/20 text-red-400/80 hover:bg-red-500/10 transition-all cursor-pointer flex items-center justify-center"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">Cancelar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/** Shared notification list content — minimalistic design */
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
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  const handleRemindClient = (notif: Notification) => {
    const data = parseNotifBody(notif.body);
    if (!data || !data.clientPhone || data.clientPhone.length < 10) return;

    const reminderMsg = `✅ *Agendamento confirmado, ${data.clientName}!*\n\nNa *Black Diamond*\n\n✂️ ${data.services}\n📅 ${data.dateTime}\n💰 ${data.totalPrice}\n\n🔗 *Para cancelar ou reagendar:*\n${data.manageUrl}\n\nAguardamos você! 💈`;

    const waUrl = `https://wa.me/${data.clientPhone}?text=${encodeURIComponent(reminderMsg)}`;
    window.open(waUrl, '_blank');
  };

  const handleDelete = (id: string) => {
    clearNotification(id);
    setSelectedNotif(null);
  };

  // Detail view
  if (selectedNotif) {
    return (
      <NotificationDetail
        notif={selectedNotif}
        onBack={() => setSelectedNotif(null)}
        onRemind={() => handleRemindClient(selectedNotif)}
        onDelete={() => handleDelete(selectedNotif.id)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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

      {/* Notification list — minimalistic */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
              <Bell size={22} className="text-zinc-700" />
            </div>
            <p className="text-[12px] text-zinc-500 font-medium">Nenhuma notificação</p>
            <p className="text-[10px] text-zinc-600 mt-1">Novos agendamentos aparecerão aqui</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const data = parseNotifBody(notif.body);
            const displayName = data ? data.clientName : notif.title;
            const displayTime = data ? data.dateTime.split(' às ')[1] : '';

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) markAllAsRead();
                  setSelectedNotif(notif);
                }}
                className={`flex items-center gap-3 px-5 py-4 border-b border-white/[0.04] cursor-pointer transition-all active:bg-white/[0.03] ${
                  notif.read ? '' : 'bg-white/[0.02]'
                }`}
              >
                {/* Unread dot */}
                <div
                  className="shrink-0 w-2 h-2 rounded-full bg-[#C5A059]"
                  style={{ opacity: notif.read ? 0 : 1 }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-[14px] font-semibold truncate ${notif.read ? 'text-zinc-400' : 'text-white'}`}
                    >
                      {displayName}
                    </p>
                    {displayTime && (
                      <span className="shrink-0 text-[12px] text-[#C5A059] font-bold tabular-nums">
                        {displayTime}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    {data
                      ? data.services.split(', ').slice(0, 2).join(', ')
                      : timeAgo(notif.created_at)}
                    {data &&
                      data.services.split(', ').length > 2 &&
                      ` +${data.services.split(', ').length - 2}`}
                  </p>
                </div>

                {/* Chevron */}
                <ChevronRight size={16} className="shrink-0 text-zinc-700" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const NotificationBell: React.FC<{ variant: 'mobile' | 'desktop' }> = ({ variant }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, clearNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (variant !== 'desktop' || !isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, variant]);

  return (
    <>
      {variant === 'desktop' ? (
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
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
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
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
