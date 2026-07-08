import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ArrowLeft, Check, Trash2, Calendar, AlertTriangle, Clock, Star } from 'lucide-react';
import { useNotifications, type Notification } from '../../hooks/useNotifications';

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

/** Shared notification list content — used by both desktop panel and mobile page */
function NotificationListContent({
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  clearNotification,
  onNotifClick,
  onClose,
  hideHeader = false,
}: {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  onNotifClick: (notif: Notification) => void;
  onClose?: () => void;
  hideHeader?: boolean;
}) {
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
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
            <Bell size={28} className="text-zinc-700 mb-2" />
            <p className="text-[11px] text-zinc-500">Nenhuma notificação</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => onNotifClick(notif)}
              className={`flex items-start gap-3 px-5 py-3.5 border-b border-white/[0.04] cursor-pointer transition-colors group ${
                notif.read ? 'hover:bg-white/[0.02]' : 'bg-white/[0.03] hover:bg-white/[0.05]'
              }`}
            >
              <div className="shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
                {getNotifIcon(notif.title)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-[13px] font-semibold truncate ${
                      notif.read ? 'text-zinc-400' : 'text-white'
                    }`}
                  >
                    {notif.title}
                  </p>
                  {!notif.read && <span className="shrink-0 w-2 h-2 rounded-full bg-[#C5A059]" />}
                </div>
                <p className="text-[12px] text-zinc-500 mt-0.5 line-clamp-2">{notif.body}</p>
                <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(notif.created_at)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearNotification(notif.id);
                }}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer"
                aria-label="Remover"
              >
                <Trash2 size={13} className="text-zinc-600" />
              </button>
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
                  markAsRead={markAsRead}
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
