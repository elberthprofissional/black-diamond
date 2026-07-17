import { useState, useRef, useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationsPanel from './notifications/NotificationsPanel';

const NotificationBell: FC<{ variant: 'mobile' | 'desktop' }> = ({ variant }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, clearNotification, bulkDelete } =
    useNotifications();
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
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, variant]);

  if (variant === 'desktop') {
    return (
      <>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer w-full text-left text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
        >
          <div className="relative shrink-0">
            <Bell size={16} className="text-zinc-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D4AF37] text-black text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold tracking-wide flex-1">Notificações</span>
        </button>

        {isOpen && (
          <>
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-[2px]"
            />
            <div
              ref={panelRef}
              className="fixed top-0 left-0 bottom-0 z-[200] w-[380px] bg-[#0A0A0A] border-r border-white/[0.06] shadow-2xl flex flex-col animate-slide-in"
            >
              <NotificationsPanel
                notifications={notifications}
                unreadCount={unreadCount}
                markAllAsRead={markAllAsRead}
                bulkDelete={bulkDelete}
                onClose={() => setIsOpen(false)}
                onDelete={(id) => clearNotification?.(id)}
              />
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <button
      onClick={() => navigate('/admin/notificacoes')}
      className="relative flex items-center justify-center cursor-pointer"
    >
      <Bell size={20} className="text-zinc-400" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D4AF37] text-black text-[9px] font-bold flex items-center justify-center leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
