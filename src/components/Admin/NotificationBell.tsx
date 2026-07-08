import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2, Calendar, AlertTriangle, Clock, Star } from 'lucide-react';
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

function getNotifIcon(title: string): React.ReactNode {
  if (title.toLowerCase().includes('agendamento') || title.toLowerCase().includes('booking')) {
    return <Calendar size={14} className="text-emerald-400" />;
  }
  if (title.toLowerCase().includes('mensalidade') || title.toLowerCase().includes('mensalista')) {
    return <AlertTriangle size={14} className="text-amber-400" />;
  }
  if (title.toLowerCase().includes('parabéns') || title.toLowerCase().includes('resumo')) {
    return <Star size={14} className="text-[#C5A059]" />;
  }
  return <Clock size={14} className="text-blue-400" />;
}

interface NotificationBellProps {
  variant: 'mobile' | 'desktop';
}

/** Extracts clean display text from notification body (strips phone/url parts) */
function getDisplayBody(body: string): string {
  const parts = body.split(' | ');
  // Show only: name | services | date
  if (parts.length >= 3) {
    return `${parts[0].trim()} — ${parts[1].trim()} — ${parts[2].trim()}`;
  }
  return body;
}

/** Shared notification list content — used by both desktop panel and mobile page */
function NotificationListContent({
  notifications,
  unreadCount,
  markAllAsRead,
  clearNotification,
  onNotifClick,
  onClose,
  hideHeader = false,
}: {
  notifications: Notification[];
  unreadCount: number;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  onNotifClick: (notif: Notification) => void;
  onClose?: () => void;
  hideHeader?: boolean;
}) {
  const handleRemindClient = (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    // Parse body: "clientName | services | date às time | totalPrice | clientPhone | manageUrl"
    const parts = notif.body.split(' | ');
    if (parts.length < 5) return;

    const clientName = parts[0].replace(/\s*\[MENSALISTA\]/, '').trim();
    const services = parts[1].trim();
    const dateTime = parts[2].trim();

    // Handle both old (5 parts) and new (6 parts) formats
    let totalPrice = '';
    let clientPhone: string;
    let manageUrl: string;

    if (parts.length >= 6) {
      totalPrice = parts[3].trim();
      clientPhone = parts[4].trim();
      manageUrl = parts[5].trim();
    } else {
      clientPhone = parts[3].trim();
      manageUrl = parts[4].trim();
    }

    if (!clientPhone || clientPhone.length < 10) return;

    let reminderMsg = `✅ *Agendamento confirmado, ${clientName}!*\n\nNa *Black Diamond*\n\n✂️ ${services}\n📅 ${dateTime}`;
    if (totalPrice) reminderMsg += `\n💰 ${totalPrice}`;
    reminderMsg += `\n\n🔗 *Para cancelar ou reagendar:*\n${manageUrl}\n\nAguardamos você! 💈`;

    const waUrl = `https://wa.me/${clientPhone}?text=${encodeURIComponent(reminderMsg)}`;
    window.open(waUrl, '_blank');
  };
  return (
    <div className="flex flex-col h-full">
      {/* Header — hidden when parent provides its own */}
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

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
              <Bell size={22} className="text-zinc-700" />
            </div>
            <p className="text-[12px] text-zinc-500 font-medium">Nenhuma notificação</p>
            <p className="text-[10px] text-zinc-600 mt-1">Novos agendamentos aparecerão aqui</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${
                notif.read
                  ? 'bg-white/[0.02] border-white/[0.04]'
                  : 'bg-gradient-to-br from-[#111] to-[#0a0a0a] border-[#C5A059]/20'
              }`}
            >
              {/* Gold accent line for unread */}
              {!notif.read && (
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent" />
              )}

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      notif.read ? 'bg-white/[0.04]' : 'bg-[#C5A059]/10'
                    }`}
                  >
                    {getNotifIcon(notif.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p
                        className={`text-[13px] font-semibold ${notif.read ? 'text-zinc-400' : 'text-white'}`}
                      >
                        {notif.title}
                      </p>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-[#C5A059]" />}
                    </div>
                    <p className={`text-[12px] ${notif.read ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {getDisplayBody(notif.body)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notif.id);
                    }}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06] transition-all cursor-pointer"
                    aria-label="Remover"
                  >
                    <Trash2 size={13} className="text-zinc-600" />
                  </button>
                </div>

                {/* Time */}
                <p className="text-[10px] text-zinc-600 mb-3">{timeAgo(notif.created_at)}</p>

                {/* Action buttons for booking notifications */}
                {notif.tag?.startsWith('booking-') && (
                  <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
                    <button
                      onClick={(e) => handleRemindClient(notif, e)}
                      className="flex-1 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Lembrete
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: implement reschedule
                      }}
                      className="flex-1 h-9 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Reagendar
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: implement cancel
                      }}
                      className="h-9 px-3 rounded-xl border border-red-500/20 text-red-400/80 hover:bg-red-500/10 transition-all cursor-pointer flex items-center justify-center"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Cancelar
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const NotificationBell: React.FC<NotificationBellProps> = ({ variant }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click (desktop only)
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

  const handleNotifClick = (notif: Notification) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.url) {
      window.location.href = notif.url;
    }
    setIsOpen(false);
  };

  const isDesktop = variant === 'desktop';

  return (
    <>
      {/* Toggle button */}
      {isDesktop ? (
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
          className="relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all cursor-pointer w-full text-left text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]"
        >
          <Bell size={16} className="text-zinc-600 shrink-0" />
          <span className="text-[11px] font-bold tracking-wide flex-1">Notificações</span>
        </button>
      ) : (
        <button
          onClick={() => navigate('/admin/notificacoes')}
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
          className="relative w-10 h-10 rounded-full hover:bg-white/[0.06] text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Bell size={20} />
        </button>
      )}

      {/* Desktop: sliding panel from left (Instagram style) */}
      {isDesktop && (
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[190] bg-black/50"
              />
              {/* Panel */}
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
                  onNotifClick={handleNotifClick}
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
