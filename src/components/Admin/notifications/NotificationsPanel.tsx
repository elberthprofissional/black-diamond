import { useState } from 'react';
import { Bell, X as XIcon } from 'lucide-react';
import { type Notification } from '../../../hooks/useNotifications';
import NotificationDetail from './NotificationDetail';
import NotificationItem from './NotificationItem';
import NotificationFilters from './NotificationFilters';

interface NotificationsPanelProps {
  notifications: Notification[];
  unreadCount: number;
  markAllAsRead: () => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function NotificationsPanel({
  notifications,
  unreadCount,
  markAllAsRead,
  onClose,
  onDelete,
}: NotificationsPanelProps) {
  const [selected, setSelected] = useState<Notification | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const displayed = onlyUnread ? notifications.filter((n) => !n.read) : notifications;

  if (selected) {
    return (
      <NotificationDetail notif={selected} onBack={() => setSelected(null)} onClose={onClose} />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5">
          <Bell size={16} className="text-[#C5A059]" />
          <h2 className="text-[14px] font-bold text-white">Notificações</h2>
          {unreadCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A059]/15 text-[#C5A059] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-[#C5A059] bg-[#C5A059]/10 hover:bg-[#C5A059]/20 border border-[#C5A059]/20 hover:border-[#C5A059]/30 transition-all cursor-pointer active:scale-95"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Marcar {unreadCount} lida{unreadCount !== 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <XIcon size={14} />
          </button>
        </div>
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
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] px-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-4">
              <Bell size={24} className="text-zinc-700" />
            </div>
            <p className="text-[13px] text-zinc-400 font-medium mb-1">Nenhuma notificação</p>
            <p className="text-[11px] text-zinc-600">
              {onlyUnread
                ? 'Todas as notificações foram lidas.'
                : 'Quando houver novidades, elas aparecerão aqui.'}
            </p>
          </div>
        ) : (
          displayed.map((n) => (
            <NotificationItem key={n.id} notif={n} onSelect={setSelected} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
}
