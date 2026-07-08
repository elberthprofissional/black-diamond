import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationListContent } from '../components/Admin/NotificationBell';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } =
    useNotifications();

  const handleNotifClick = (notif: { id: string; url?: string | null; read: boolean }) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.url) {
      window.location.href = notif.url;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Mobile header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.06] shrink-0 lg:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[15px] font-bold text-white">Notificações</h1>
      </div>

      {/* Content — uses shared component, header hidden since page has its own */}
      <div className="flex-1 min-h-0">
        <NotificationListContent
          notifications={notifications}
          unreadCount={unreadCount}
          markAllAsRead={markAllAsRead}
          clearNotification={clearNotification}
          onNotifClick={handleNotifClick}
          hideHeader
        />
      </div>
    </div>
  );
};

export default NotificationsPage;
