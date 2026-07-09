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
      {/* Header — clean, no background box */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-[16px] font-bold text-white">Notificações</span>
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
