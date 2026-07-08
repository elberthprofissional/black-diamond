import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationListContent } from '../components/Admin/NotificationBell';

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAllAsRead, clearNotification } = useNotifications();

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
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
