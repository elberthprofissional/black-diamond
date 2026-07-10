import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Calendar, Clock, Settings } from 'lucide-react';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import { NotificationListContent } from '../components/Admin/NotificationBell';

function parseNotifBody(body: string) {
  // Try JSON format first (new format)
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.clientName === 'string') {
      return {
        clientName: parsed.clientName.replace(/\s*\[MENSALISTA\]/, '').trim(),
        services: parsed.services || '',
        dateTime: parsed.dateTime || '',
        totalPrice: parsed.totalPrice || '',
        clientPhone: parsed.clientPhone || '',
        manageUrl: parsed.manageUrl || '',
      };
    }
  } catch {
    // Not JSON — fall through to legacy format
  }

  // Legacy pipe-separated format (backwards compatibility)
  const parts = body.split(' | ');
  if (parts.length < 6) return null;
  return {
    clientName: parts[0].replace(/\s*\[MENSALISTA\]/, '').trim(),
    services: parts[1].trim(),
    dateTime: parts[2].trim(),
    totalPrice: parts[3].trim(),
    clientPhone: parts[4].trim(),
    manageUrl: parts[5].trim(),
  };
}

// Timestamp relativo: "3 min atrás", "2 horas", "Ontem às 18:45"
function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin} min`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay === 1) return `Ontem`;
  if (diffDay < 7) return `${diffDay} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Ícone por tipo de notificação
function getNotifIcon(tag: string | null) {
  if (tag?.startsWith('booking-') || tag?.startsWith('cancelled-')) {
    return { icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10' };
  }
  if (tag?.startsWith('reminder-')) {
    return { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  }
  return { icon: Settings, color: 'text-zinc-400', bg: 'bg-white/[0.04]' };
}

// Agrupar por período
function groupByPeriod(notifs: Notification[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; items: Notification[] }[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  notifs.forEach((n) => {
    const d = new Date(n.created_at);
    if (d >= today) {
      // Hoje — já aparece como header separado
      if (!groups.find((g) => g.label === 'Hoje')) {
        groups.push({ label: 'Hoje', items: [] });
      }
      groups.find((g) => g.label === 'Hoje')!.items.push(n);
    } else if (d >= weekAgo) {
      thisWeek.push(n);
    } else {
      older.push(n);
    }
  });

  if (thisWeek.length > 0) groups.push({ label: 'Esta semana', items: thisWeek });
  if (older.length > 0) groups.push({ label: 'Anteriores', items: older });

  return groups;
}

const NotificationsPage: FC = () => {
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
      if (activeFilter === 'bookings') {
        return n.tag?.startsWith('booking-') || n.tag?.startsWith('cancelled-');
      }
      if (activeFilter === 'reminders') return n.tag?.startsWith('reminder-');
      if (activeFilter === 'system') {
        return (
          !n.tag?.startsWith('booking-') &&
          !n.tag?.startsWith('reminder-') &&
          !n.tag?.startsWith('cancelled-')
        );
      }
      return true;
    });
  };

  const filteredNotifications = filterNotifications(notifications);
  const grouped = groupByPeriod(filteredNotifications);

  const filterTabs = [
    { key: 'all' as const, label: 'Tudo', count: notifications.length },
    {
      key: 'bookings' as const,
      label: 'Agendamentos',
      count: notifications.filter(
        (n) => n.tag?.startsWith('booking-') || n.tag?.startsWith('cancelled-')
      ).length,
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
        (n) =>
          !n.tag?.startsWith('booking-') &&
          !n.tag?.startsWith('reminder-') &&
          !n.tag?.startsWith('cancelled-')
      ).length,
    },
  ];

  const handleDeleteSelected = async () => {
    if (!clearNotification) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => clearNotification(id)));
    } catch {
      // Notifications already removed from state
    }
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  // Se tá vendo o detalhe, usa o componente existente
  if (selected) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <NotificationListContent
          notifications={notifications}
          unreadCount={unreadCount}
          markAllAsRead={markAllAsRead}
          selected={selected}
          onSelect={setSelected}
          variant="mobile"
          clearNotification={clearNotification}
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
            onClick={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedIds(new Set());
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
            notifications.length > 0 && (
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
      {!isSelectionMode && notifications.length > 0 && (
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
      {!isSelectionMode && filteredNotifications.length === 0 && (
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

      {/* Notification List — Agrupada por período */}
      {!isSelectionMode && grouped.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {grouped.map((group) => (
            <div key={group.label}>
              {/* Section header */}
              <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.03]">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  {group.label}
                </span>
              </div>

              {/* Items */}
              {group.items.map((notif) => {
                const data = parseNotifBody(notif.body);
                const name = data ? data.clientName : notif.title;
                const services = data ? data.services.split(', ').slice(0, 2).join(', ') : '';
                const extra = data ? Math.max(0, data.services.split(', ').length - 2) : 0;
                const { icon: Icon, color, bg } = getNotifIcon(notif.tag);
                const isSelected = selectedIds.has(notif.id);

                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      if (isSelectionMode) toggleSelect(notif.id);
                      else setSelected(notif);
                    }}
                    onDoubleClick={() => {
                      setIsSelectionMode(true);
                      setSelectedIds(() => new Set([notif.id]));
                    }}
                    className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-all hover:bg-white/[0.02] active:bg-white/[0.04] border-b border-white/[0.03] ${
                      isSelected ? 'bg-[#C5A059]/[0.05]' : ''
                    } ${!notif.read ? 'bg-white/[0.01]' : ''}`}
                  >
                    {/* Checkbox (selection mode) */}
                    {isSelectionMode && (
                      <div
                        className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 mt-1 transition-all ${
                          isSelected ? 'bg-[#C5A059] border-[#C5A059]' : 'border-zinc-600'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-2.5 h-2.5 text-black"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Icon by type */}
                    <div
                      className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}
                    >
                      <Icon size={16} className={color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[13px] font-medium ${notif.read ? 'text-zinc-400' : 'text-white'}`}
                        >
                          {notif.title}
                        </span>
                        {!notif.read && !isSelectionMode && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] shrink-0" />
                        )}
                      </div>
                      {services && (
                        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                          {name}
                          {extra > 0 ? ` +${extra}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Relative time */}
                    {!isSelectionMode && (
                      <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">
                        {relativeTime(notif.created_at)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
