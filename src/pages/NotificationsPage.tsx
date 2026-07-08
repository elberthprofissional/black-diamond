import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationListContent } from '../components/Admin/NotificationBell';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, clearNotification } = useNotifications();

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0E0E0E]/95 backdrop-blur-md border-b border-white/[0.04] px-5 py-3.5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-[15px] font-bold text-white">Notificações</span>
      </div>

      <NotificationListContent
        notifications={notifications}
        unreadCount={unreadCount}
        markAllAsRead={markAllAsRead}
        clearNotification={clearNotification}
        hideHeader
      />
    </div>
  );
};

export default NotificationsPage;
