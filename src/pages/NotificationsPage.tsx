import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import { NotificationListContent } from '../components/Admin/NotificationBell';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, clearNotification } = useNotifications();
  const [selected, setSelected] = useState<Notification | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'bookings' | 'reminders' | 'system'>(
    'all'
  );

  const filterNotifications = (notifs: Notification[]) => {
    if (activeFilter === 'all') return notifs;
    return notifs.filter((n) => {
      if (activeFilter === 'bookings') return n.tag?.startsWith('booking-');
      if (activeFilter === 'reminders') return n.tag?.startsWith('reminder-');
      if (activeFilter === 'system') {
        return !n.tag?.startsWith('booking-') && !n.tag?.startsWith('reminder-');
      }
      return true;
    });
  };

  const filteredNotifications = filterNotifications(notifications);

  const filterTabs = [
    { key: 'all' as const, label: 'Tudo', count: notifications.length },
    {
      key: 'bookings' as const,
      label: 'Agendamentos',
      count: notifications.filter((n) => n.tag?.startsWith('booking-')).length,
    },
    {
      key: 'reminders' as const,
      label: 'Lembretes',
      count: notifications.filter((n) => n.tag?.startsWith('reminder-')).length,
    },
    {
      key: 'system' as const,
      label: 'Sistema',
      count: notifications.filter(
        (n) => !n.tag?.startsWith('booking-') && !n.tag?.startsWith('reminder-')
      ).length,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (selected ? setSelected(null) : navigate(-1))}
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
        {notifications.length > 0 && !selected && (
          <button
            onClick={markAllAsRead}
            className="text-[11px] font-bold text-[#C5A059] hover:text-[#A68233] transition-colors cursor-pointer"
          >
            Marcar todas
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      {!selected && notifications.length > 0 && (
        <div className="flex gap-2 px-4 py-3 border-b border-white/[0.04] overflow-x-auto scrollbar-hide">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                activeFilter === tab.key
                  ? 'bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/20'
                  : 'text-zinc-500 bg-white/[0.03] border border-transparent'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    activeFilter === tab.key
                      ? 'bg-[#C5A059]/20 text-[#C5A059]'
                      : 'bg-white/[0.06] text-zinc-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!selected && filteredNotifications.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
            <Bell size={28} className="text-zinc-700" />
          </div>
          <p className="text-[14px] text-zinc-400 font-medium mb-1">Nenhuma notificação</p>
          <p className="text-[12px] text-zinc-600">
            {activeFilter === 'all'
              ? 'Quando houver novidades, elas aparecerão aqui.'
              : 'Nenhuma notificação nesta categoria.'}
          </p>
        </div>
      )}

      {/* Notification List */}
      {filteredNotifications.length > 0 && (
        <NotificationListContent
          notifications={filteredNotifications}
          unreadCount={unreadCount}
          markAllAsRead={markAllAsRead}
          hideHeader
          selected={selected}
          onSelect={setSelected}
          variant="mobile"
          clearNotification={clearNotification}
        />
      )}
    </div>
  );
};

export default NotificationsPage;
