import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Trash2, Check } from 'lucide-react';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import { NotificationDetail } from '../components/Admin/NotificationBell';
import { relativeTime, parseNotifBody } from '../lib/notifications';

const NotificationsPage: FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, clearNotification } = useNotifications();
  const [selected, setSelected] = useState<Notification | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const displayed = onlyUnread ? notifications.filter((n) => !n.read) : notifications;

  // Detail view
  if (selected) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <NotificationDetail notif={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
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

      {/* Filter: Todas / Não lidas */}
      {notifications.length > 0 && (
        <div className="flex gap-2 px-4 py-3 border-b border-white/[0.04]">
          <button
            onClick={() => setOnlyUnread(false)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              !onlyUnread ? 'bg-[#C5A059]/15 text-[#C5A059]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setOnlyUnread(true)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              onlyUnread ? 'bg-[#C5A059]/15 text-[#C5A059]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Não lidas
            {unreadCount > 0 && (
              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06]">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
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
            {displayed.map((notif) => {
              const data = parseNotifBody(notif.body);
              const name = data ? data.clientName : notif.title;
              const desc = data ? data.services.split(', ').slice(0, 2).join(', ') : '';
              const extra = data ? Math.max(0, data.services.split(', ').length - 2) : 0;
              const isConfirming = confirmingId === notif.id;

              const handleDeleteClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!isConfirming) {
                  setConfirmingId(notif.id);
                } else {
                  if (window.confirm('Excluir notificação? Essa ação é irreversível.')) {
                    clearNotification?.(notif.id);
                  }
                  setConfirmingId(null);
                }
              };

              return (
                <div
                  key={notif.id}
                  className="group relative flex items-start gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                >
                  <button
                    onClick={() => {
                      setConfirmingId(null);
                      setSelected(notif);
                    }}
                    className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${notif.read ? 'bg-white/[0.04]' : 'bg-[#C5A059]/10'}`}
                      >
                        {notif.read ? (
                          <Bell size={18} className="text-zinc-500" />
                        ) : (
                          <span className="text-[14px] font-bold text-[#C5A059]">
                            {name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {!notif.read && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#C5A059] border-2 border-[#0A0A0A]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[14px] ${notif.read ? 'text-zinc-400' : 'text-white font-medium'}`}
                      >
                        {name}
                      </p>
                      {desc && (
                        <p className="text-[12px] text-zinc-500 mt-0.5 truncate">
                          {desc}
                          {extra > 0 ? ` +${extra}` : ''}
                        </p>
                      )}
                      <span className="text-[11px] text-zinc-600 mt-1 block">
                        {relativeTime(notif.created_at)}
                      </span>
                    </div>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={handleDeleteClick}
                    className={`shrink-0 mt-2 p-1.5 rounded-lg transition-all cursor-pointer ${
                      isConfirming
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'text-zinc-600 hover:text-red-400 opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                    }`}
                    title={isConfirming ? 'Confirmar exclusão' : 'Excluir notificação'}
                  >
                    {isConfirming ? <Check size={16} /> : <Trash2 size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
