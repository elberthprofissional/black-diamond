import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import { NotificationListContent } from '../components/Admin/NotificationBell';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, clearNotification } = useNotifications();
  const [selected, setSelected] = useState<Notification | null>(null);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (selected ? setSelected(null) : navigate(-1))}
            className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-[16px] font-bold text-white">Notificações</span>
          {unreadCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A059]/15 text-[#C5A059] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {notifications.length > 0 && !selected && (
          <button
            onClick={markAllAsRead}
            className="text-[11px] font-bold text-[#C5A059] hover:text-[#A68233] transition-colors cursor-pointer"
          >
            Marcar todas
          </button>
        )}
      </div>

      <NotificationListContent
        notifications={notifications}
        unreadCount={unreadCount}
        markAllAsRead={markAllAsRead}
        hideHeader
        selected={selected}
        onSelect={setSelected}
        variant="mobile"
        clearNotification={clearNotification}
      />
    </div>
  );
};

export default NotificationsPage;
