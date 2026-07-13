import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import NotificationDetail from '../components/Admin/notifications/NotificationDetail';
import NotificationItem from '../components/Admin/notifications/NotificationItem';
import NotificationFilters from '../components/Admin/notifications/NotificationFilters';

const NotificationsPage: FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, clearNotification } = useNotifications();
  const [selected, setSelected] = useState<Notification | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const displayed = onlyUnread ? notifications.filter((n) => !n.read) : notifications;

  if (selected) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <NotificationDetail
          notif={selected}
          onBack={() => setSelected(null)}
          onClose={() => navigate('/admin')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>
          <span className="text-[16px] font-bold text-white">Notificações</span>
          {unreadCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A059]/15 text-[#C5A059] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Marcar lidas
          </button>
        )}
      </div>

      {/* Filter */}
      {notifications.length > 0 && (
        <NotificationFilters
          onlyUnread={onlyUnread}
          unreadCount={unreadCount}
          onChange={setOnlyUnread}
        />
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 px-6 mt-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-4">
              <Bell size={24} className="text-zinc-700" />
            </div>
            <p className="text-[14px] text-zinc-400 font-medium mb-1">Nenhuma notificação</p>
            <p className="text-[12px] text-zinc-600">
              {onlyUnread
                ? 'Todas as notificações foram lidas.'
                : 'Quando houver novidades, elas aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {displayed.map((notif) => (
              <NotificationItem
                key={notif.id}
                notif={notif}
                onSelect={setSelected}
                onDelete={(id) => clearNotification?.(id)}
                size="normal"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
