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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const handleDeleteSelected = async () => {
    if (!clearNotification) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => clearNotification(id)));
    } catch (e) {
      // Notifications already removed from state
    }
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedIds(new Set());
              } else if (selected) {
                setSelected(null);
              } else {
                navigate(-1);
              }
            }}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>
          {isSelectionMode ? (
            <span className="text-[14px] font-medium text-white">
              {selectedIds.size} {selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
            </span>
          ) : (
            <>
              <span className="text-[16px] font-bold text-white">Notificações</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A059]/15 text-[#C5A059] font-bold">
                  {unreadCount}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isSelectionMode ? (
            <>
              <button
                onClick={() => {
                  setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
                }}
                className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Todas
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-30"
              >
                Excluir
              </button>
            </>
          ) : (
            notifications.length > 0 &&
            !selected && (
              <button
                onClick={() => setIsSelectionMode(true)}
                className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Selecionar
              </button>
            )
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      {!isSelectionMode && !selected && notifications.length > 0 && (
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
                  className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeFilter === tab.key ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-white/[0.06] text-zinc-500'}`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isSelectionMode && !selected && filteredNotifications.length === 0 && (
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
          isSelectionMode={isSelectionMode}
          setIsSelectionMode={setIsSelectionMode}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />
      )}
    </div>
  );
};

export default NotificationsPage;
